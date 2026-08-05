import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {Popover,PopoverContent,PopoverTrigger} from '../ui/popover'
import {Calendar} from '../ui/calendar'
import taskService from '../../services/taskService';
import courseService from '../../services/courseService';
import courseMemberService from '../../services/courseMemberService';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

const TASK_TYPES = [
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'ASSIGNMENT', label: 'Assignment' },
  { value: 'EXAM', label: 'Exam' },
  { value: 'READING', label: 'Reading' },
  { value: 'LAB_REPORT', label: 'Lab Report' },
];

const TASK_PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

export const CreateTaskDialog = ({ defaultCourseId, defaultType, open, onOpenChange, onTaskCreated }) => {

  const [formData, setFormData] = useState({
    title: '',
    description: '',
  })
  const [dueDate, setDueDate] = useState(undefined)
  const [courseId, setCourseId] = useState('none')
  const [type, setType] = useState(defaultType || 'PERSONAL')
  const [priority, setPriority] = useState('MEDIUM')
  const [courses, setCourses] = useState([])
  const [teamMembers, setTeamMembers] = useState([]);
  const [assigneeUserId, setAssigneeUserId] = useState('me');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      courseService.getAllCourses({ size: 100 }).then((result) => {
        setCourses(result.content || []);
      });
      setCourseId(defaultCourseId ? String(defaultCourseId) : 'none');
      setType(defaultType || 'PERSONAL');
      setAssigneeUserId('me');
    }
  }, [open, defaultCourseId]);

  const selectedCourse = courses.find((c) => String(c.id) === courseId);

  useEffect(() => {
    if (courseId !== 'none' && selectedCourse?.isOwner) {
      courseMemberService.listMembers(courseId).then((result) => {
        setTeamMembers(result.filter((m) => m.status === 'ACTIVE' && !m.isOwner));
      });
    } else {
      setTeamMembers([]);
      setAssigneeUserId('me');
    }
  }, [courseId, selectedCourse?.isOwner]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
  e.preventDefault()
  setError('')
  setLoading(true)

  try {
    const payload = {
      ...formData,
      dueDate: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
      courseId: courseId !== 'none' ? Number(courseId) : null,
      type,
      priority,
      assigneeUserId: assigneeUserId !== 'me' ? Number(assigneeUserId) : null,
    }

    const newTask = await taskService.createTask(payload)
    onTaskCreated(newTask)
    resetForm()
  } catch (err) {
    setError(err.response?.data?.message || 'Failed to create task')
  } finally {
    setLoading(false)
  }
}

  const resetForm = () => {
    setFormData({ title: '', description: '' });
    setDueDate(undefined);
    setType('PERSONAL');
    setPriority('MEDIUM');
    setAssigneeUserId('me');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task, optionally attached to a course
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Design homepage mockup"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Task details..."
                value={formData.description}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Course</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="No course — personal task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No course — personal task</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={String(course.id)}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {teamMembers.length > 0 && (
              <div className="space-y-2">
                <Label>Assign to</Label>
                <Select value={assigneeUserId} onValueChange={setAssigneeUserId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="me">Myself</SelectItem>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.userId} value={String(m.userId)}>{m.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full  justify-start text-left font-normal ${
                      !dueDate && 'text-muted-foreground'
                    }`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP') : 'No due date'}
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className="rounded-lg border"
                  />
                </PopoverContent>
              </Popover>
            </div>

          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </Button>

          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskDialog;
