import { useState } from 'react';
import { Calendar, Edit, Trash2, ExternalLink, Users } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import EditTaskDialog from './EditTaskDialog';
import taskService from '../../services/taskService';
import { format } from 'date-fns';
import { isOverdueTask, parseLocalDate, overdueHours, formatOverdueGap } from '../../lib/taskDates';
import { useAuth } from '../../hooks/useAuth';
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
} from "../ui/alert-dialog";
import { useToast } from '../../hooks/use-toast';

const PRIORITY_PILL = {
  LOW: 'pill-priority-low',
  MEDIUM: 'pill-priority-medium',
  HIGH: 'pill-priority-high',
};

const TYPE_LABELS = {
  ASSIGNMENT: 'Assignment',
  EXAM: 'Exam',
  READING: 'Reading',
  LAB_REPORT: 'Lab Report',
  PERSONAL: 'Personal',
};

export const TaskItem = ({ task, onTaskUpdated, onTaskDeleted }) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const {toast} = useToast();
  const { user } = useAuth();

  // A shared-project task list shows every teammate's tasks — you can only
  // check off / edit / delete the ones actually assigned to you.
  const isMine = !task.assigneeId || task.assigneeId === user?.id;

  const handleToggleComplete = async () => {
    try {
      const updatedTask = await taskService.markTaskCompleted(task.id);
      onTaskUpdated(updatedTask);
      toast({
        title: "Task updated",
        description: `"${task.title}" has been successfully updated.`,
        variant: "default",
      })
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await taskService.deleteTask(task.id);
      onTaskDeleted(task.id);
      toast({
        title: "Task deleted",
        description: `"${task.title}" has been successfully deleted.`,
        variant: "default",
      })
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
       })
    }
  };

  const isOverdue = isOverdueTask(task);
  const statusPill = task.completed
    ? { label: 'Done', className: 'pill-done' }
    : isOverdue
      ? { label: 'Overdue', className: 'pill-overdue' }
      : { label: 'In Progress', className: 'pill-in-progress' };

  return (
    <>
      <Card
        className={`rounded-xl shadow-ios-sm transition-all ${task.completed ? 'opacity-60' : ''}`}
      >
        <CardContent className="p-3.5">
          <div className="flex items-start gap-3">
              {isMine ? (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Checkbox
                            checked={task.completed}
                            className="mt-1"
                        />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete your
                                Task !
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleToggleComplete} className='bg-destructive hover:bg-destructive/90'>complete Task</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Checkbox checked={task.completed} disabled className="mt-1" />
              )}

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4
                    className={`text-sm font-medium ${task.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                  >
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {isMine && !task.completed && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditOpen(true)}
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  )}

                      {isMine && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete your
                              Task !
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className='bg-destructive hover:bg-destructive/90'>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      )}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className={`border-transparent font-medium ${statusPill.className}`}>
                  {statusPill.label}
                </Badge>

                {isOverdue && (
                  <span className="text-xs font-medium text-[hsl(var(--status-overdue-fg))]">
                    {formatOverdueGap(overdueHours(task))}
                  </span>
                )}

                {task.priority && (
                  <Badge variant="outline" className={`border-transparent font-medium ${PRIORITY_PILL[task.priority]}`}>
                    {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
                  </Badge>
                )}

                {task.dueDate && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(parseLocalDate(task.dueDate), 'MMM dd, yyyy')}
                  </span>
                )}

                {task.courseTitle && (
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    {task.courseTitle}
                  </Badge>
                )}

                {!isMine && task.assigneeName && (
                  <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-primary">
                    <Users className="h-3 w-3" />
                    {task.assigneeName}
                  </Badge>
                )}

                {task.type && task.type !== 'PERSONAL' && (
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    {TYPE_LABELS[task.type]}
                  </Badge>
                )}

                {task.durationMinutes && (
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    {task.durationMinutes} min
                  </Badge>
                )}

                {task.youtubeVideoId && (
                  <a
                    href={`https://www.youtube.com/watch?v=${task.youtubeVideoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Watch on YouTube
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditTaskDialog
        task={task}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onTaskUpdated={onTaskUpdated}
      />
    </>
  );
};

export default TaskItem;
