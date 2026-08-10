import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  Home,
  Sun,
  ListTodo,
  LayoutGrid,
  CalendarDays,
  Timer,
  NotebookText,
  BarChart3,
  MonitorCog,
  AlertTriangle,
  Settings,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
} from 'lucide-react';

// Grouped to read like a native macOS sidebar (Mail/Notes-style sections)
// rather than one flat list.
const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/today', label: 'Today', icon: Sun },
      { to: '/dashboard', label: 'Dashboard', icon: Home },
      { to: '/stats', label: 'Stats', icon: BarChart3 },
      { to: '/insights', label: 'Insights', icon: MonitorCog },
      { to: '/overdue', label: 'Overdue', icon: AlertTriangle },
    ],
  },
  {
    label: 'Study',
    items: [
      { to: '/courses', label: 'Portfolio', icon: LayoutGrid },
      { to: '/tasks', label: 'Tasks', icon: ListTodo },
      { to: '/calendar', label: 'Calendar', icon: CalendarDays },
      { to: '/notes', label: 'Notes', icon: NotebookText },
      { to: '/summaries', label: 'Summaries', icon: Sparkles },
    ],
  },
  {
    label: 'Together',
    items: [
      { to: '/focus-rooms', label: 'Focus Rooms', icon: Timer },
      { to: '/circles', label: 'Circles', icon: Users },
      { to: '/friends', label: 'Friends', icon: Users },
    ],
  },
];

const BOTTOM_ITEMS = [
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/profile', label: 'Profile', icon: User },
];

const SIDEBAR_STORAGE_KEY = 'sidebar-expanded';

const railLinkClass = (expanded) => ({ isActive }) =>
  `group relative flex h-10 items-center rounded-xl transition-all duration-150 ${
    expanded ? 'w-full gap-3 px-3' : 'w-10 justify-center'
  } ${
    isActive
      ? 'bg-primary/15 text-primary font-medium'
      : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
  }`;

const RailLink = ({ item, expanded, onNavigate }) => (
  <NavLink to={item.to} className={railLinkClass(expanded)} title={expanded ? undefined : item.label} onClick={onNavigate}>
    <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
    {expanded ? (
      <span className="truncate text-sm">{item.label}</span>
    ) : (
      <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-lg bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground opacity-0 shadow-ios-md ring-1 ring-border/60 transition-opacity group-hover:opacity-100 z-50">
        {item.label}
      </span>
    )}
  </NavLink>
);

// Shared between the desktop rail and the mobile drawer — `expanded` is always true
// on mobile (there's no icon-only collapsed state there), and `onNavigate`/`onClose`
// close the drawer after a link or the quick-add button is used.
const SidebarNav = ({ expanded, onQuickAdd, onNavigate, showCollapseToggle, onToggleExpanded }) => (
  <>
    <div className={`mb-4 flex items-center ${expanded ? 'justify-between px-1 pr-8' : 'justify-center'}`}>
      <NavLink
        to="/today"
        onClick={onNavigate}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-ios-sm"
      >
        <FolderKanban className="h-[18px] w-[18px]" />
      </NavLink>
      {expanded && <span className="ml-2 flex-1 truncate text-[15px] font-semibold text-foreground">Collab</span>}
    </div>

    <button
      type="button"
      onClick={() => {
        onQuickAdd();
        onNavigate?.();
      }}
      title={expanded ? undefined : 'Quick Add'}
      className={`mb-5 flex h-9 items-center gap-2 rounded-full border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary ${
        expanded ? 'w-full justify-center px-3' : 'w-9 justify-center'
      }`}
    >
      <Plus className="h-4 w-4 shrink-0" />
      {expanded && <span className="text-sm font-medium">Quick Add</span>}
    </button>

    <nav className="flex flex-1 flex-col justify-between overflow-hidden">
      <div className="space-y-5 overflow-y-auto thin-scrollbar">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {expanded && (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                {section.label}
              </p>
            )}
            <ul className={expanded ? 'space-y-0.5' : 'space-y-1'}>
              {section.items.map((item) => (
                <li key={item.to}>
                  <RailLink item={item} expanded={expanded} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div>
        <ul className="space-y-0.5 border-t border-border/70 pt-3">
          {BOTTOM_ITEMS.map((item) => (
            <li key={item.to}>
              <RailLink item={item} expanded={expanded} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>

        {showCollapseToggle && (
          <button
            type="button"
            onClick={onToggleExpanded}
            title={expanded ? 'Collapse' : 'Expand'}
            className={`mt-3 flex h-9 items-center gap-2 rounded-xl text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground ${
              expanded ? 'w-full justify-start px-3' : 'w-9 justify-center'
            }`}
          >
            {expanded ? (
              <ChevronLeft className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )}
            {expanded && <span className="text-sm font-medium">Collapse</span>}
          </button>
        )}
      </div>
    </nav>
  </>
);

export const Sidebar = ({ onQuickAdd, mobileOpen = false, onMobileClose }) => {
  const [expanded, setExpanded] = useState(() => localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true');

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(expanded));
  }, [expanded]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onMobileClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, onMobileClose]);

  return (
    <>
      {/* Desktop rail — collapsible icon rail, hidden below md. Translucent
          macOS-sidebar material (backdrop blur over a semi-transparent warm
          surface) rather than a flat opaque panel. */}
      <aside
        className={`hidden shrink-0 flex-col border-r border-border/60 bg-card/70 backdrop-blur-xl pb-4 transition-[width] duration-200 md:flex ${
          expanded ? 'w-56 items-stretch px-3' : 'w-16 items-center'
        }`}
      >
        {/* Traffic-light-safe top inset — also the window's drag handle, since
            this corner sits directly under the native macOS window controls
            (see tauri.conf.json's titleBarStyle: "Overlay"). */}
        <div data-tauri-drag-region className="h-10 w-full shrink-0" />

        <SidebarNav
          expanded={expanded}
          onQuickAdd={onQuickAdd}
          showCollapseToggle
          onToggleExpanded={() => setExpanded((e) => !e)}
        />
      </aside>

      {/* Mobile off-canvas drawer — below md, opened from the AppShell header's menu button */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[80vw] animate-in slide-in-from-left flex-col border-r border-border/60 bg-card px-3 py-4 shadow-ios-lg duration-200">
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Close menu"
              className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarNav expanded onQuickAdd={onQuickAdd} onNavigate={onMobileClose} showCollapseToggle={false} />
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
