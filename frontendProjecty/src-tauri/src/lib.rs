use std::sync::{
  atomic::{AtomicBool, Ordering},
  Arc,
};
use tauri::image::Image;
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{
  Emitter, Listener, LogicalPosition, LogicalSize, Manager, PhysicalPosition, PhysicalSize,
  Position, Runtime, Size, WebviewWindow, WindowEvent,
};

const COMPACT_WIDGET_WIDTH: f64 = 420.0;
const COMPACT_WIDGET_HEIGHT: f64 = 124.0;
const EXPANDED_WIDGET_WIDTH: f64 = 300.0;
const EXPANDED_WIDGET_HEIGHT: f64 = 340.0;

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct FrontmostApp {
  name: String,
  bundle_id: Option<String>,
  icon_data_url: Option<String>,
}

// This intentionally exposes only the frontmost application's public name and
// bundle identifier, and public application icon. It cannot inspect window
// titles, page URLs, documents, keystrokes, or message contents.
#[tauri::command]
fn frontmost_app() -> Option<FrontmostApp> {
  #[cfg(target_os = "macos")]
  {
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    use objc2_app_kit::{NSBitmapImageFileType, NSBitmapImageRep, NSWorkspace};
    use objc2_foundation::NSDictionary;

    let app = NSWorkspace::sharedWorkspace().frontmostApplication()?;
    let name = app.localizedName()?.to_string();
    let bundle_id = app.bundleIdentifier().map(|value| value.to_string());
    let icon_data_url = app.icon().and_then(|icon| {
      let tiff = icon.TIFFRepresentation()?;
      let bitmap = NSBitmapImageRep::imageRepWithData(&tiff)?;
      let properties = NSDictionary::new();
      let png = unsafe {
        bitmap.representationUsingType_properties(NSBitmapImageFileType::PNG, &properties)
      }?;
      Some(format!("data:image/png;base64,{}", STANDARD.encode(png.to_vec())))
    });

    return Some(FrontmostApp {
      name,
      bundle_id,
      icon_data_url,
    });
  }

  #[cfg(not(target_os = "macos"))]
  {
    None
  }
}

fn position_widget_under_tray<R: Runtime>(widget: &WebviewWindow<R>, icon_rect: &tauri::Rect) {
  let scale = widget.scale_factor().unwrap_or(1.0);
  let icon_pos = icon_rect.position.to_physical::<f64>(scale);
  let icon_size = icon_rect.size.to_physical::<f64>(scale);
  let widget_size = widget
    .outer_size()
    .unwrap_or(PhysicalSize::new(300, 340));

  let x = icon_pos.x + icon_size.width / 2.0 - (widget_size.width as f64) / 2.0;
  let y = icon_pos.y + icon_size.height + 4.0;

  let _ = widget.set_position(Position::Physical(PhysicalPosition::new(x as i32, y as i32)));
}

fn position_widget_top_center<R: Runtime>(widget: &WebviewWindow<R>, width: f64, height: f64) {
  let _ = widget.set_size(Size::Logical(LogicalSize::new(width, height)));

  let monitor = widget
    .current_monitor()
    .ok()
    .flatten()
    .or_else(|| widget.primary_monitor().ok().flatten());

  if let Some(monitor) = monitor {
    let scale = monitor.scale_factor();
    let monitor_position = monitor.position().to_logical::<f64>(scale);
    let monitor_size = monitor.size().to_logical::<f64>(scale);
    let x = monitor_position.x + ((monitor_size.width - width) / 2.0);
    // Clear the macOS menu bar while keeping the capsule visually attached to
    // the top edge, matching native focus utilities.
    let y = monitor_position.y + 34.0;
    let _ = widget.set_position(Position::Logical(LogicalPosition::new(x, y)));
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_global_shortcut::Builder::new().build())
    .invoke_handler(tauri::generate_handler![frontmost_app])
    .setup(|app| {
      let focus_session_active = Arc::new(AtomicBool::new(false));
      let widget_expanded = Arc::new(AtomicBool::new(false));

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Without a running session this behaves like a native tray popover.
      // During a session, losing focus folds the expanded panel back into the
      // persistent top-center timer instead of hiding the Pomodoro entirely.
      if let Some(widget) = app.get_webview_window("widget") {
        let widget_for_focus = widget.clone();
        let active_for_focus = focus_session_active.clone();
        let expanded_for_focus = widget_expanded.clone();
        widget.on_window_event(move |event| {
          if matches!(event, WindowEvent::Focused(false)) {
            if active_for_focus.load(Ordering::Relaxed) {
              expanded_for_focus.store(false, Ordering::Relaxed);
              position_widget_top_center(
                &widget_for_focus,
                COMPACT_WIDGET_WIDTH,
                COMPACT_WIDGET_HEIGHT,
              );
              let _ = widget_for_focus.emit("widget-compact", ());
            } else {
              let _ = widget_for_focus.hide();
            }
          }
        });

        // Real NSVisualEffectView frosted glass, not a CSS approximation. The
        // radius must match WidgetPage.jsx's rounded-[28px] card exactly —
        // the native blur view fills the whole window, and the webview's
        // card sits flush against it with no margin, so the two rounded
        // rects need to line up pixel-for-pixel.
        #[cfg(target_os = "macos")]
        let _ = window_vibrancy::apply_vibrancy(
          &widget,
          window_vibrancy::NSVisualEffectMaterial::Popover,
          None,
          Some(28.0),
        );

        // alwaysOnTop alone only floats above other normal windows — it
        // doesn't survive a fullscreen app owning its own Space, which is
        // its own separate layer in macOS. Menu-bar popovers like Bartender
        // or CleanShot X stay reachable there by explicitly opting the
        // window into every Space (including fullscreen ones) and raising
        // it to a menu-bar-adjacent level, which Tauri's window config has
        // no declarative option for — this reaches into the raw NSWindow.
        #[cfg(target_os = "macos")]
        {
          use objc2_app_kit::{NSStatusWindowLevel, NSView, NSWindowCollectionBehavior};
          use raw_window_handle::{HasWindowHandle, RawWindowHandle};

          if let Ok(handle) = widget.window_handle() {
            if let RawWindowHandle::AppKit(appkit_handle) = handle.as_raw() {
              unsafe {
                let ns_view: &NSView = appkit_handle.ns_view.cast().as_ref();
                if let Some(ns_window) = ns_view.window() {
                  ns_window.setCollectionBehavior(
                    NSWindowCollectionBehavior::CanJoinAllSpaces
                      | NSWindowCollectionBehavior::FullScreenAuxiliary
                      | NSWindowCollectionBehavior::Stationary,
                  );
                  ns_window.setLevel(NSStatusWindowLevel);
                }
              }
            }
          }
        }

      }

      if let Some(widget) = app.get_webview_window("widget") {
        let widget_for_mode = widget.clone();
        let expanded_for_mode = widget_expanded.clone();
        app.listen("widget-display-mode", move |event| {
          let mode = serde_json::from_str::<serde_json::Value>(event.payload())
            .ok()
            .and_then(|payload| payload.get("mode").and_then(|value| value.as_str()).map(str::to_owned));

          if mode.as_deref() == Some("expanded") {
            expanded_for_mode.store(true, Ordering::Relaxed);
            position_widget_top_center(
              &widget_for_mode,
              EXPANDED_WIDGET_WIDTH,
              EXPANDED_WIDGET_HEIGHT,
            );
            let _ = widget_for_mode.show();
            let _ = widget_for_mode.set_focus();
          } else if mode.as_deref() == Some("compact") {
            expanded_for_mode.store(false, Ordering::Relaxed);
            position_widget_top_center(
              &widget_for_mode,
              COMPACT_WIDGET_WIDTH,
              COMPACT_WIDGET_HEIGHT,
            );
            let _ = widget_for_mode.show();
          }
        });
      }

      // Menu-bar presence for an active Focus session. The countdown itself is
      // computed once, in the main window's LiveSession.jsx tick — this just
      // mirrors whatever text that tick emits, so there's no second timer here.
      let active_for_tray = focus_session_active.clone();
      let expanded_for_tray = widget_expanded.clone();
      let tray_icon = TrayIconBuilder::new()
        .icon(Image::from_bytes(include_bytes!("../icons/tray-icon.png"))?)
        .on_tray_icon_event(move |tray, event| {
          if let TrayIconEvent::Click {
            rect,
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
          } = event
          {
            let app = tray.app_handle();
            if let Some(widget) = app.get_webview_window("widget") {
              if active_for_tray.load(Ordering::Relaxed) {
                let should_expand = !expanded_for_tray.load(Ordering::Relaxed);
                expanded_for_tray.store(should_expand, Ordering::Relaxed);
                if should_expand {
                  position_widget_top_center(&widget, EXPANDED_WIDGET_WIDTH, EXPANDED_WIDGET_HEIGHT);
                  let _ = widget.emit("widget-expanded", ());
                  let _ = widget.show();
                  let _ = widget.set_focus();
                } else {
                  position_widget_top_center(&widget, COMPACT_WIDGET_WIDTH, COMPACT_WIDGET_HEIGHT);
                  let _ = widget.emit("widget-compact", ());
                  let _ = widget.show();
                }
              } else if widget.is_visible().unwrap_or(false) {
                let _ = widget.hide();
              } else {
                let _ = widget.set_size(Size::Logical(LogicalSize::new(
                  EXPANDED_WIDGET_WIDTH,
                  EXPANDED_WIDGET_HEIGHT,
                )));
                position_widget_under_tray(&widget, &rect);
                let _ = widget.show();
                let _ = widget.set_focus();
              }
            }
          }
        })
        .build(app)?;

      let tray_for_update = tray_icon.clone();
      let widget_for_update = app.get_webview_window("widget");
      let active_for_update = focus_session_active.clone();
      let expanded_for_update = widget_expanded.clone();
      app.listen("session-update", move |event| {
        if let Ok(payload) = serde_json::from_str::<serde_json::Value>(event.payload()) {
          if let Some(label) = payload.get("remainingLabel").and_then(|v| v.as_str()) {
            let _ = tray_for_update.set_title(Some(label));
          }
        }

        let was_active = active_for_update.swap(true, Ordering::Relaxed);
        if let Some(widget) = &widget_for_update {
          if !was_active {
            expanded_for_update.store(false, Ordering::Relaxed);
            position_widget_top_center(widget, COMPACT_WIDGET_WIDTH, COMPACT_WIDGET_HEIGHT);
            let _ = widget.emit("widget-compact", ());
          }
          let _ = widget.show();
        }
      });

      let tray_for_clear = tray_icon.clone();
      let widget_for_clear = app.get_webview_window("widget");
      let active_for_clear = focus_session_active.clone();
      let expanded_for_clear = widget_expanded.clone();
      app.listen("session-cleared", move |_event| {
        active_for_clear.store(false, Ordering::Relaxed);
        expanded_for_clear.store(false, Ordering::Relaxed);
        let _ = tray_for_clear.set_title(None::<&str>);
        if let Some(widget) = &widget_for_clear {
          let _ = widget.set_size(Size::Logical(LogicalSize::new(
            EXPANDED_WIDGET_WIDTH,
            EXPANDED_WIDGET_HEIGHT,
          )));
          let _ = widget.hide();
        }
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
