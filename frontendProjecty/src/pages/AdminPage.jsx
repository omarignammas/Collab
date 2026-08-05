import { useState, useEffect } from 'react';
import { ShieldCheck, Users, UserPlus, CalendarDays, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import PageHero from '../components/shared/PageHero';
import TrendAreaChart from '../components/charts/TrendAreaChart';
import Avatar from '../components/shared/Avatar';
import adminService from '../services/adminService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/use-toast';
import { format } from 'date-fns';

const StatTile = (props) => {
  const Icon = props.icon;
  return (
    <Card className="border-border/80 bg-card">
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-numeric text-2xl font-bold text-foreground">{props.value}</p>
          <p className="text-sm text-muted-foreground">{props.label}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export const AdminPage = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [statsResult, usersResult] = await Promise.all([
          adminService.getStats(),
          adminService.getUsers({ page: 1, size: 50 }),
        ]);
        setStats(statsResult);
        setUsers(usersResult.content);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDelete = async (targetUser) => {
    setDeletingId(targetUser.id);
    try {
      await adminService.deleteUser(targetUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      setStats((prev) => (prev ? { ...prev, totalUsers: prev.totalUsers - 1 } : prev));
      toast({ title: 'User deleted', description: `${targetUser.firstName} ${targetUser.lastName} no longer has access.` });
    } catch (error) {
      toast({
        title: "Couldn't delete user",
        description: error.response?.data?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const trendData = (stats?.signupsByDay || []).map((d) => ({
    label: format(new Date(d.date), 'MMM d'),
    fullLabel: format(new Date(d.date), 'EEEE, MMM d'),
    value: d.count,
  }));

  return (
    <div className="w-full px-4 py-10">
      <PageHero icon={ShieldCheck} title="Admin" subtitle="Who's using Collab." />

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-border/80 bg-card" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl border border-border/80 bg-card" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatTile icon={Users} label="Total users" value={stats.totalUsers} />
            <StatTile icon={UserPlus} label="Joined today" value={stats.newUsersToday} />
            <StatTile
              icon={CalendarDays}
              label="Joined this week"
              value={trendData.slice(-7).reduce((sum, d) => sum + d.value, 0)}
            />
          </div>

          <Card className="border-border/80 bg-card">
            <CardContent className="p-5">
              <p className="section-header mb-1">signups — last 14 days</p>
              <TrendAreaChart data={trendData} height={200} valueLabel="signups" />
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card">
            <CardContent className="p-5">
              <p className="section-header mb-4">all users ({users.length})</p>
              <div className="divide-y divide-border/60">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 py-3">
                    <Avatar name={`${u.firstName} ${u.lastName}`} avatarUrl={u.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{u.firstName} {u.lastName}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    {u.role === 'ADMIN' && (
                      <span className="pill-in-progress shrink-0 rounded px-1.5 py-0.5 text-xs">Admin</span>
                    )}
                    <span className="shrink-0 text-xs text-muted-foreground">
                      Joined {format(new Date(u.createdAt), 'MMM d, yyyy')}
                    </span>
                    {u.id !== currentUser?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Delete ${u.firstName} ${u.lastName}`}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {u.firstName} {u.lastName}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This disables their account — they won't be able to sign in anymore. Their courses,
                              tasks, and notes stay in place.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={deletingId === u.id}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(u)}
                              disabled={deletingId === u.id}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {deletingId === u.id ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
