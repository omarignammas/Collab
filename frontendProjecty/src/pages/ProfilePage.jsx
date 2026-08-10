import { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import Avatar from '../components/shared/Avatar';
import EditProfileDialog from '../components/shared/EditProfileDialog';
import { useAuth } from '../hooks/useAuth';
import courseService from '../services/courseService';
import taskService from '../services/taskService';

export const ProfilePage = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ courses: 0, completedTasks: 0, totalTasks: 0 });
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [coursesResult, tasksResult] = await Promise.all([
          courseService.getAllCourses({ size: 1 }),
          taskService.getAllTasks({ size: 500 }),
        ]);
        setCounts({
          courses: coursesResult.totalElements,
          completedTasks: tasksResult.content.filter((t) => t.completed).length,
          totalTasks: tasksResult.totalElements,
        });
      } catch (error) {
        console.error('Error fetching profile stats:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 min-[360px]:flex-row min-[360px]:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Profile</h1>
          <p className="mt-1 text-muted-foreground">Your account at a glance.</p>
        </div>
        <Button className="w-full min-[360px]:w-auto" variant="outline" onClick={() => setIsEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
      </div>

      <Card className="mb-6 border-border/80 bg-card">
        <CardContent className="flex items-center gap-4 p-6">
          <Avatar name={`${user?.firstName} ${user?.lastName}`} avatarUrl={user?.avatarUrl} size="xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-foreground">{user?.firstName} {user?.lastName}</p>
            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 min-[300px]:grid-cols-3 sm:gap-4">
        <Card className="border-border/80 bg-card">
          <CardContent className="px-2 py-5 text-center sm:p-5">
            <p className="font-numeric text-2xl font-bold text-foreground">{loading ? '—' : counts.courses}</p>
            <p className="mt-1 text-xs text-muted-foreground">Projects</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-card">
          <CardContent className="px-2 py-5 text-center sm:p-5">
            <p className="font-numeric text-2xl font-bold text-foreground">{loading ? '—' : counts.completedTasks}</p>
            <p className="mt-1 text-xs text-muted-foreground">Tasks completed</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-card">
          <CardContent className="px-2 py-5 text-center sm:p-5">
            <p className="font-numeric text-2xl font-bold text-foreground">{loading ? '—' : counts.totalTasks}</p>
            <p className="mt-1 text-xs text-muted-foreground">Total tasks</p>
          </CardContent>
        </Card>
      </div>

      <EditProfileDialog open={isEditOpen} onOpenChange={setIsEditOpen} />
    </div>
  );
};

export default ProfilePage;
