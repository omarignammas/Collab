import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Link2, Pencil, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import Avatar from '../components/shared/Avatar';
import EditProfileDialog from '../components/shared/EditProfileDialog';
import profileService from '../services/profileService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/use-toast';

const PROJECT_PALETTE = [
  'bg-primary', 'bg-[hsl(var(--chart-1))]', 'bg-[hsl(var(--chart-2))]', 'bg-[hsl(var(--chart-3))]',
  'bg-[hsl(var(--chart-4))]', 'bg-muted-foreground/60',
];

const StatTile = ({ value, label }) => (
  <div className="min-w-0 border-l border-border/60 px-4 py-4 first:border-l-0 sm:px-5">
    <p className="font-numeric text-2xl font-bold text-foreground sm:text-[26px]">{value}</p>
    <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
  </div>
);

const ShippingCadence = ({ weeks }) => {
  const total = weeks.reduce((sum, w) => sum + w.shippedCount, 0);
  const peak = Math.max(1, ...weeks.map((w) => w.shippedCount));

  return (
    <Card className="border-border/80 bg-card shadow-ios-sm">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="section-header">Shipping cadence</p>
          <p className="text-xs text-muted-foreground">{total} shipped · {weeks.length} weeks · peak {peak}/wk</p>
        </div>
        <div className="mt-5 flex h-32 items-end gap-1.5">
          {weeks.map((week, index) => (
            <div key={index} className="group relative flex-1" title={`${week.weekLabel}: ${week.shippedCount} shipped`}>
              <div
                className={`w-full rounded-t-sm transition-colors ${week.currentWeek ? 'bg-[hsl(var(--chart-2))]' : week.shippedCount === 0 ? 'bg-muted/50' : 'bg-primary'}`}
                style={{ height: `${Math.max(4, (week.shippedCount / peak) * 100)}px` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
          <span>{weeks.length} weeks ago</span>
          <span>this week</span>
        </div>
      </CardContent>
    </Card>
  );
};

const WhereWorkGoes = ({ projects }) => {
  if (!projects.length) {
    return (
      <Card className="border-border/80 bg-card shadow-ios-sm">
        <CardContent className="p-5 sm:p-6">
          <p className="section-header">Where the work goes</p>
          <p className="mt-4 text-sm text-muted-foreground">Nothing shipped yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 bg-card shadow-ios-sm">
      <CardContent className="p-5 sm:p-6">
        <p className="section-header">Where the work goes</p>
        <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted">
          {projects.map((project, index) => (
            <div key={project.title} className={PROJECT_PALETTE[index % PROJECT_PALETTE.length]} style={{ width: `${project.percent}%` }} />
          ))}
        </div>
        <div className="mt-4 space-y-2.5">
          {projects.map((project, index) => (
            <div key={project.title} className="flex items-center gap-2.5 text-sm">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${PROJECT_PALETTE[index % PROJECT_PALETTE.length]}`} />
              <span className="min-w-0 flex-1 truncate text-foreground/90">{project.title}</span>
              <span className="font-numeric shrink-0 text-xs text-muted-foreground">{project.shippedCount} · {project.percent}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const RecentlyShipped = ({ items }) => (
  <Card className="border-border/80 bg-card shadow-ios-sm">
    <CardContent className="p-5 sm:p-6">
      <p className="section-header">Recently shipped</p>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nothing shipped yet.</p>
      ) : (
        <div className="mt-3 divide-y divide-border/50">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-3 py-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(var(--chart-3))]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                {item.projectTitle && <p className="truncate text-xs text-muted-foreground">{item.projectTitle}</p>}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{item.completedAt ? format(new Date(item.completedAt), 'MMM d') : ''}</span>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

const CircleSection = ({ circle, currentUserId }) => {
  const navigate = useNavigate();
  if (!circle) return null;

  return (
    <Card className="border-border/80 bg-card shadow-ios-sm">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="section-header">Circle</p>
          <span className="text-xs font-medium text-muted-foreground">{circle.name}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {circle.members.map((member) => (
            <button
              key={member.userId}
              type="button"
              onClick={() => !member.self && navigate(`/profile/${member.userId}`)}
              className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-sm transition-colors ${
                member.self ? 'border-primary/30 bg-primary/10 text-foreground' : 'border-border/70 text-foreground/90 hover:border-primary/40 hover:bg-primary/5'
              }`}
            >
              <Avatar name={member.displayName} avatarUrl={member.avatarUrl} size="sm" />
              <span className="max-w-32 truncate font-medium">{member.self ? 'You' : member.displayName}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const BuilderProfilePage = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const result = userId ? await profileService.getProfile(userId) : await profileService.getMyProfile();
      setProfile(result);
    } catch (error) {
      toast({ title: 'Could not load profile', description: error.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [userId]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast({ title: 'Profile link copied' });
  };

  const showOnboardingNudge = profile?.ownProfile && !profile.mission;

  if (loading || !profile) {
    return <div className="w-full px-4 py-10"><div className="h-[520px] animate-pulse rounded-xl border border-border/80 bg-card" /></div>;
  }

  return (
    <div className="w-full px-4 py-8 sm:py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={`${profile.firstName} ${profile.lastName}`} avatarUrl={profile.avatarUrl} size="xl" />
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{profile.firstName} {profile.lastName}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">@{profile.email.split('@')[0]}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">Builder #{String(profile.builderNumber).padStart(3, '0')}</span>
              {profile.openToChat && (
                <span className="flex items-center gap-1.5 rounded-full border border-[hsl(var(--chart-3))]/30 bg-[hsl(var(--chart-3))]/10 px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--chart-3))]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--chart-3))]" />
                  Open to chat
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={copyLink}><Link2 className="mr-2 h-3.5 w-3.5" />Copy profile link</Button>
          {profile.ownProfile && <Button size="sm" onClick={() => setEditOpen(true)}><Pencil className="mr-2 h-3.5 w-3.5" />Edit Profile</Button>}
        </div>
      </div>

      {showOnboardingNudge && (
        <Card className="mb-6 border-primary/30 bg-primary/[0.05]">
          <CardContent className="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Finish setting up your profile</p>
                <p className="mt-0.5 text-sm text-muted-foreground">Add a mission so your Circle knows what you're building toward.</p>
              </div>
            </div>
            <Button size="sm" onClick={() => setEditOpen(true)} className="shrink-0">Add mission</Button>
          </CardContent>
        </Card>
      )}

      {profile.mission && (
        <Card className="mb-6 border-border/80 bg-card shadow-ios-sm">
          <CardContent className="p-5 sm:p-6">
            <p className="section-header mb-2">Mission</p>
            <p className="text-lg leading-relaxed text-foreground/90">&ldquo;{profile.mission}&rdquo;</p>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6 border-border/80 bg-card shadow-ios-sm">
        <CardContent className="grid grid-cols-2 gap-y-4 p-2 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile value={profile.stats.shipped} label="Shipped" />
          <StatTile value={`${profile.stats.focusedHours}h`} label="Focused" />
          <StatTile value={`${profile.stats.dailiesPercent}%`} label="Dailies" />
          <StatTile value={`${profile.stats.onTimePercent}%`} label="On time" />
          <StatTile value={profile.stats.dayStreak} label="Day streak" />
          <StatTile value={profile.stats.projectsCount} label="Projects" />
        </CardContent>
      </Card>

      <div className="mb-6"><ShippingCadence weeks={profile.shippingCadence} /></div>

      <div className="mb-6 grid gap-5 lg:grid-cols-2">
        <WhereWorkGoes projects={profile.whereWorkGoes} />
        <RecentlyShipped items={profile.recentlyShipped} />
      </div>

      <CircleSection circle={profile.circle} currentUserId={currentUser?.id} />

      {profile.ownProfile && (
        <EditProfileDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          profile={profile}
          onProfileUpdated={setProfile}
        />
      )}
    </div>
  );
};

export default BuilderProfilePage;
