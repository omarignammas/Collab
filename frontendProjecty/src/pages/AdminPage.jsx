import { useState, useEffect } from 'react';
import { Ban, Check, Clock, Mail, RotateCcw, ShieldCheck, Trash2, Users } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
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

const STATUS_STYLES = {
  PENDING: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  APPROVED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  SUSPENDED: 'border-destructive/30 bg-destructive/10 text-destructive',
};

export const AdminPage = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState(null);

  const loadAdminData = async () => {
      setLoading(true);
      try {
        const [statsResult, usersResult, waitlistResult] = await Promise.all([
          adminService.getStats(),
          adminService.getUsers({ page: 1, size: 50 }),
          adminService.getWaitlist({ page: 1, size: 50 }),
        ]);
        setStats(statsResult);
        setUsers(usersResult.content);
        setWaitlist(waitlistResult.content);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const replaceUser = (updatedUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
  };

  const handleApprove = async (targetUser) => {
    setBusyUserId(targetUser.id);
    try {
      const updatedUser = await adminService.approveUser(targetUser.id);
      replaceUser(updatedUser);
      await loadAdminData();
      toast({ title: 'User approved', description: `${targetUser.firstName} now has a 7-day trial.` });
    } catch (error) {
      toast({
        title: "Couldn't approve user",
        description: error.response?.data?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setBusyUserId(null);
    }
  };

  const handleSuspend = async (targetUser) => {
    setBusyUserId(targetUser.id);
    try {
      const updatedUser = await adminService.suspendUser(targetUser.id);
      replaceUser(updatedUser);
      await loadAdminData();
      toast({ title: 'User suspended', description: `${targetUser.firstName} can no longer sign in.` });
    } catch (error) {
      toast({
        title: "Couldn't suspend user",
        description: error.response?.data?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setBusyUserId(null);
    }
  };

  const handleReactivate = async (targetUser) => {
    setBusyUserId(targetUser.id);
    try {
      const updatedUser = await adminService.reactivateUser(targetUser.id);
      replaceUser(updatedUser);
      await loadAdminData();
      toast({ title: 'User reactivated', description: `${targetUser.firstName} can sign in again.` });
    } catch (error) {
      toast({
        title: "Couldn't reactivate user",
        description: error.response?.data?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setBusyUserId(null);
    }
  };

  const handleDelete = async (targetUser) => {
    setBusyUserId(targetUser.id);
    try {
      await adminService.deleteUser(targetUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      await loadAdminData();
      toast({ title: 'Account deleted', description: `${targetUser.firstName}'s account has been removed.` });
    } catch (error) {
      toast({
        title: "Couldn't delete user",
        description: error.response?.data?.message || 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setBusyUserId(null);
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatTile icon={Users} label="Active users" value={stats.totalUsers} />
            <StatTile icon={Clock} label="Pending requests" value={stats.pendingUsers || 0} />
            <StatTile icon={Ban} label="Suspended" value={stats.suspendedUsers || 0} />
            <StatTile icon={Mail} label="Waitlist signups" value={stats.waitlistCount || 0} />
          </div>

          <Card className="border-border/80 bg-card">
            <CardContent className="p-5">
              <p className="section-header mb-1">signups — last 14 days</p>
              <TrendAreaChart data={trendData} height={200} valueLabel="signups" />
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card">
            <CardContent className="p-5">
              <p className="section-header mb-4">access requests and users ({users.length})</p>
              <div className="divide-y divide-border/60">
                {users.map((u) => (
                  <div key={u.id} className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center">
                    <Avatar name={`${u.firstName} ${u.lastName}`} avatarUrl={u.avatarUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{u.firstName} {u.lastName}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      {u.role === 'ADMIN' && (
                        <span className="pill-in-progress shrink-0 rounded px-1.5 py-0.5 text-xs">Admin</span>
                      )}
                      <span className={`shrink-0 rounded border px-2 py-1 text-xs font-medium ${STATUS_STYLES[u.accountStatus] || STATUS_STYLES.PENDING}`}>
                        {u.accountStatus || 'PENDING'}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        Joined {format(new Date(u.createdAt), 'MMM d, yyyy')}
                      </span>
                      {u.trialExpiresAt && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          Trial ends {format(new Date(u.trialExpiresAt), 'MMM d, yyyy')}
                        </span>
                      )}
                      {u.role !== 'ADMIN' && u.accountStatus === 'PENDING' && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleApprove(u)}
                          disabled={busyUserId === u.id}
                        >
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                          {busyUserId === u.id ? 'Approving...' : 'Approve'}
                        </Button>
                      )}
                      {u.id !== currentUser?.id && u.role !== 'ADMIN' && u.accountStatus !== 'SUSPENDED' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleSuspend(u)}
                          disabled={busyUserId === u.id}
                          className="border-destructive/30 text-destructive hover:bg-destructive/10"
                        >
                          <Ban className="mr-1.5 h-3.5 w-3.5" />
                          {busyUserId === u.id ? 'Suspending...' : 'Suspend'}
                        </Button>
                      )}
                      {u.id !== currentUser?.id && u.role !== 'ADMIN' && u.accountStatus === 'SUSPENDED' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleReactivate(u)}
                          disabled={busyUserId === u.id}
                        >
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                          {busyUserId === u.id ? 'Reactivating...' : 'Reactivate'}
                        </Button>
                      )}
                      {u.id !== currentUser?.id && u.role !== 'ADMIN' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={busyUserId === u.id}
                              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {u.firstName}&apos;s account?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This scrubs their name, email, and avatar, and permanently blocks them from signing in. It can&apos;t be
                                undone, and their email address won&apos;t be reusable for a new account.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(u)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete account
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card">
            <CardContent className="p-5">
              <p className="section-header mb-4">desktop app waitlist ({waitlist.length})</p>
              {waitlist.length === 0 ? (
                <p className="text-sm text-muted-foreground">No signups yet — the desktop waitlist form is on the landing page.</p>
              ) : (
                <div className="divide-y divide-border/60">
                  {waitlist.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 py-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Mail className="h-4 w-4" />
                      </span>
                      <p className="min-w-0 flex-1 truncate text-sm text-foreground">{entry.email}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {format(new Date(entry.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
