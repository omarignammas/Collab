use tauri::image::Image;
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{
  Listener, Manager, PhysicalPosition, PhysicalSize, Position, Runtime, WebviewWindow,
};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_global_shortcut::Builder::new().build())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

        // The widget window is created hidden by tauri.conf.json and toggled
        // by the tray icon below. It intentionally stays visible when another
        // app becomes active so it remains useful over fullscreen workspaces.
      if let Some(widget) = app.get_webview_window("widget") {
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

      // Menu-bar presence for an active Focus session. The countdown itself is
      // computed once, in the main window's LiveSession.jsx tick — this just
      // mirrors whatever text that tick emits, so there's no second timer here.
      let tray_icon = TrayIconBuilder::new()
        .icon(Image::from_bytes(include_bytes!("../icons/tray-icon.png"))?)
        .on_tray_icon_event(|tray, event| {
          if let TrayIconEvent::Click {
            rect,
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
          } = event
          {
            let app = tray.app_handle();
            if let Some(widget) = app.get_webview_window("widget") {
              if widget.is_visible().unwrap_or(false) {
                let _ = widget.hide();
              } else {
                position_widget_under_tray(&widget, &rect);
                let _ = widget.show();
                let _ = widget.set_focus();
              }
            }
          }
        })
        .build(app)?;

      let tray_for_update = tray_icon.clone();
      app.listen("session-update", move |event| {
        if let Ok(payload) = serde_json::from_str::<serde_json::Value>(event.payload()) {
          if let Some(label) = payload.get("remainingLabel").and_then(|v| v.as_str()) {
            let _ = tray_for_update.set_title(Some(label));
          }
        }
      });

      let tray_for_clear = tray_icon.clone();
      app.listen("session-cleared", move |_event| {
        let _ = tray_for_clear.set_title(None::<&str>);
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
