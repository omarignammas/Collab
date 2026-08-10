import { useNavigate } from 'react-router-dom';
import { EyeOff, LogOut, MonitorCog, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { ModeToggle } from '../components/ui/mode-toggle';
import { useAuth } from '../hooks/useAuth';
import { useActivityTracking } from '../context/ActivityTrackingContext';
import { Checkbox } from '../components/ui/checkbox';

export const SettingsPage = () => {
  const { user, logout } = useAuth();
  const { available, enabled, setTracking } = useActivityTracking();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-muted-foreground">Appearance and account.</p>
      </div>

      <div className="space-y-6">
        <Card className="border-border/80 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Theme</p>
              <p className="text-sm text-muted-foreground">Switch between light and dark mode.</p>
            </div>
            <ModeToggle />
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><MonitorCog className="h-4 w-4 text-primary" />Desktop activity</CardTitle>
          </CardHeader>
          <CardContent>
            {available ? <><label className="flex cursor-pointer items-start gap-3"><Checkbox className="mt-0.5" checked={enabled} onCheckedChange={(value) => setTracking(Boolean(value))} /><span><span className="block text-sm font-medium text-foreground">Track app time on this device</span><span className="mt-1 block text-sm leading-relaxed text-muted-foreground">Records only the frontmost app name and duration locally. It never reads window titles, browser pages, files, typing, or messages.</span></span></label>{enabled && <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground"><EyeOff className="h-3.5 w-3.5" />Detailed history stays on this computer.</div>}</> : <p className="text-sm text-muted-foreground">Available in the Collab desktop app on macOS.</p>}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Account</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit Profile
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <p className="text-sm text-foreground">{user?.firstName} {user?.lastName}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="text-sm text-foreground">{user?.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-foreground">Log out</p>
              <p className="text-sm text-muted-foreground">End your current session on this device.</p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="text-destructive hover:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
