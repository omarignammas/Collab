import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, UserCircle, Settings, Menu, ShieldCheck } from 'lucide-react';
import Sidebar from './Sidebar';
import { ModeToggle } from '../ui/mode-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useAuth } from '../../hooks/useAuth';
import CreateTaskDialog from '../tasks/CreateTaskDialog';
import { useToast } from '../../hooks/use-toast';
import Avatar from '../shared/Avatar';
import NotificationBell from '../notifications/NotificationBell';
import { useNotificationSocket } from '../../hooks/useNotificationSocket';

export const AppShell = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { notifications, unreadCount, markRead, markAllRead, refresh } = useNotificationSocket(!!user);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleQuickAddCreated = (task) => {
    setIsQuickAddOpen(false);
    toast({
      title: 'Task created',
      description: `"${task.title}" was added.`,
      variant: 'default',
    });
  };

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-background">
      <Sidebar
        onQuickAdd={() => setIsQuickAddOpen(true)}
        mobileOpen={isMobileNavOpen}
        onMobileClose={() => setIsMobileNavOpen(false)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* data-tauri-drag-region makes empty header space window-draggable;
            interactive children (buttons below) are unaffected since Tauri
            only starts a drag when the exact click target carries the
            attribute, not on bubled clicks from a descendant. */}
        <header
          data-tauri-drag-region
          className="z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl sm:px-6 md:justify-end"
        >
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <ModeToggle />

          {user && (
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              markRead={markRead}
              markAllRead={markAllRead}
              refresh={refresh}
            />
          )}

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 items-center gap-2 rounded-full border border-border/80 bg-card pl-1 pr-3 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <Avatar name={`${user.firstName} ${user.lastName}`} avatarUrl={user.avatarUrl} size="sm" />
                  <span className="hidden sm:inline">{user.firstName}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="font-semibold text-foreground">{user.firstName} {user.lastName}</p>
                  <p className="text-xs font-normal text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <UserCircle className="h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                {user.role === 'ADMIN' && (
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <ShieldCheck className="h-4 w-4" />
                    Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          </div>
        </header>

        <main className="min-h-0 flex-1 overscroll-contain overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      <CreateTaskDialog
        open={isQuickAddOpen}
        onOpenChange={setIsQuickAddOpen}
        onTaskCreated={handleQuickAddCreated}
      />
    </div>
  );
};

export default AppShell;
