import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Backpack, GraduationCap, User, Gauge, RefreshCw, Users, UserPlus, X, Check, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { CircularProgress } from '../components/shared/CircularProgress';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import CourseBackpack from '../components/courses/CourseBackpack';
import CreateTaskDialog from '../components/tasks/CreateTaskDialog';
import EditCourseDialog from '../components/courses/EditCourseDialog';
import AiTaskPlanDialog from '../components/courses/AiTaskPlanDialog';
import FriendPicker from '../components/focus-rooms/FriendPicker';
import Avatar from '../components/shared/Avatar';
import courseService from '../services/courseService';
import courseMemberService from '../services/courseMemberService';
import youtubeService from '../services/youtubeService';
import { useAuth } from '../hooks/useAuth';
import PageHero from '../components/shared/PageHero';
import Callout from '../components/shared/Callout';
import { useToast } from '../hooks/use-toast';

export const CourseDetailPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [progress, setProgress] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isAiPlanOpen, setIsAiPlanOpen] = useState(false);
  const [isEditCourseOpen, setIsEditCourseOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteUserIds, setInviteUserIds] = useState([]);
  const [inviting, setInviting] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const { toast } = useToast();

  const fetchCourseData = async () => {
    setLoading(true);
    try {
      const [courseData, tasksResult, progressData, membersResult] = await Promise.all([
        courseService.getCourseById(courseId),
        courseMemberService.getTeamTasks(courseId, { size: 500, sortField: 'id', direction: 'ASC' }),
        courseService.getCourseProgress(courseId),
        courseMemberService.listMembers(courseId),
      ]);

      setCourse(courseData);
      setTasks(tasksResult.content);
      setProgress(progressData);
      setMembers(membersResult);
    } catch (error) {
      console.error('Error fetching course data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const handleTaskCreated = () => {
    fetchCourseData();
    setIsCreateTaskOpen(false);
  };

  const handleCourseUpdated = (updatedCourse) => {
    setCourse(updatedCourse);
    setIsEditCourseOpen(false);
  };

  const handleResync = async () => {
    setResyncing(true);
    try {
      const response = await youtubeService.resyncPlaylist(courseId);
      toast({
        title: 'Playlist resynced',
        description: `${response.tasksImported} new task${response.tasksImported === 1 ? '' : 's'} imported${
          response.tasksSkipped ? `, ${response.tasksSkipped} already up to date` : ''
        }`,
      });
      fetchCourseData();
    } catch (error) {
      toast({
        title: 'Resync failed',
        description: error.response?.data?.message || 'Failed to resync playlist.',
        variant: 'destructive',
      });
    } finally {
      setResyncing(false);
    }
  };

  const handleInvite = async () => {
    setInviting(true);
    try {
      for (const userId of inviteUserIds) {
        await courseMemberService.inviteMember(courseId, userId);
      }
      toast({ title: 'Invites sent', description: `Invited ${inviteUserIds.length} friend${inviteUserIds.length === 1 ? '' : 's'} to this course.` });
      setInviteUserIds([]);
      setIsInviteOpen(false);
      fetchCourseData();
    } catch (error) {
      toast({
        title: 'Could not send invite',
        description: error.response?.data?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleAcceptInvite = async () => {
    try {
      await courseMemberService.acceptInvite(courseId);
      toast({ title: 'Joined course', description: `You're now part of "${course.title}".` });
      fetchCourseData();
    } catch (error) {
      toast({
        title: 'Could not accept invite',
        description: error.response?.data?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await courseMemberService.removeMember(courseId, userId);
      fetchCourseData();
    } catch (error) {
      toast({
        title: 'Could not remove member',
        description: error.response?.data?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
        Loading course...
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
        Course not found
      </div>
    );
  }

  const myMembership = members.find((m) => m.userId === user?.id);
  const isPendingInvite = myMembership && !myMembership.isOwner && myMembership.status === 'INVITED';
  const involvedUserIds = members.map((m) => m.userId);

  return (
    <div className="accent-purple w-full px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate('/courses')}
        className="mb-6 text-left text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Courses
      </Button>

      {isPendingInvite && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4">
          <p className="text-sm text-foreground">
            <span className="font-medium">{course.ownerName}</span> invited you to join this course.
          </p>
          <Button size="sm" onClick={handleAcceptInvite}>
            <Check className="mr-2 h-3.5 w-3.5" />
            Accept
          </Button>
        </div>
      )}

      <div className="mb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div
              className="hero-icon mb-4"
              style={course.colorTag ? { backgroundColor: `${course.colorTag}26`, color: course.colorTag } : undefined}
            >
              <GraduationCap className="h-8 w-8" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{course.title}</h1>
              {!course.isOwner && (
                <span className="shrink-0 rounded-full border border-border/80 bg-card px-2.5 py-1 text-xs text-muted-foreground">
                  shared by {course.ownerName}
                </span>
              )}
            </div>
            <p className="mt-3 max-w-2xl text-muted-foreground">{course.description || 'No description'}</p>
          </div>
          {course.isOwner && (
            <div className="flex shrink-0 gap-2">
              {course.youtubePlaylistId && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleResync}
                  disabled={resyncing}
                  title="Resync from YouTube"
                >
                  <RefreshCw className={`h-4 w-4 ${resyncing ? 'animate-spin' : ''}`} />
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={() => setIsEditCourseOpen(true)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Callout icon={Gauge}>
          Course progress is computed from completed vs. total tasks in this course — it updates itself as you check things off, nothing to set manually.
        </Callout>

        {course.instructorName ? (
          <div className="flex items-center gap-3 rounded-lg border border-border/80 bg-card p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <User className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{course.instructorName}</p>
              {course.instructorEmail && (
                <p className="truncate text-xs text-muted-foreground">{course.instructorEmail}</p>
              )}
            </div>
          </div>
        ) : (
          <Callout icon={User}>No instructor on file for this course yet — add one from the edit button above.</Callout>
        )}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border/80 bg-card">
          <CardContent className="flex items-center gap-6 p-5">
            {progress && (
              <>
                <CircularProgress percentage={Math.round(progress.progressPercentage)} size={100} strokeWidth={9} color="blue" />
                <div>
                  <p className="text-sm font-medium text-foreground">course progress</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {progress.completedTasks} of {progress.totalTasks} tasks completed
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="section-header">
                <Users className="h-4 w-4 text-primary" />
                team ({members.length})
              </p>
              {course.isOwner && (
                <Button size="sm" variant="outline" onClick={() => setIsInviteOpen(true)}>
                  <UserPlus className="mr-2 h-3.5 w-3.5" />
                  Invite
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center gap-2.5">
                  <Avatar name={m.displayName} avatarUrl={m.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {m.userId === user?.id ? 'You' : m.displayName}
                    </p>
                  </div>
                  {m.isOwner ? (
                    <span className="text-xs text-muted-foreground">owner</span>
                  ) : m.status === 'INVITED' ? (
                    <span className="text-xs text-muted-foreground">invited</span>
                  ) : null}
                  {course.isOwner && !m.isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveMember(m.userId)}
                      title="Remove from course"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backpack Header */}
      <div className="mb-4 flex items-center justify-between">
        <p className="section-header">
          <Backpack className="h-5 w-5 text-primary" />
          backpack
        </p>
        {course.isOwner && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsAiPlanOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              AI Plan
            </Button>
            <Button onClick={() => setIsCreateTaskOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        )}
      </div>

      {/* Backpack (tasks grouped by type) */}
      <CourseBackpack
        tasks={tasks}
        onTaskUpdated={fetchCourseData}
        onTaskDeleted={fetchCourseData}
      />

      {/* Dialogs */}
      {course.isOwner && (
        <>
          <CreateTaskDialog
            defaultCourseId={courseId}
            open={isCreateTaskOpen}
            onOpenChange={setIsCreateTaskOpen}
            onTaskCreated={handleTaskCreated}
          />

          <AiTaskPlanDialog
            courseId={courseId}
            open={isAiPlanOpen}
            onOpenChange={setIsAiPlanOpen}
            onPlanApplied={fetchCourseData}
          />

          <EditCourseDialog
            course={course}
            open={isEditCourseOpen}
            onOpenChange={setIsEditCourseOpen}
            onCourseUpdated={handleCourseUpdated}
          />

          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite friends to this course</DialogTitle>
                <DialogDescription>They'll be able to see the team's tasks and any you assign to them.</DialogDescription>
              </DialogHeader>
              <FriendPicker selected={inviteUserIds} onChange={setInviteUserIds} excludeUserIds={involvedUserIds} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
                <Button onClick={handleInvite} disabled={inviting || inviteUserIds.length === 0}>
                  {inviting ? 'Sending...' : 'Send Invites'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default CourseDetailPage;
