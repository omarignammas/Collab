import { useState, useEffect, useMemo } from 'react';
import { List, Columns3, ListTodo } from 'lucide-react';
import taskService from '../services/taskService';
import courseService from '../services/courseService';
import TaskList from '../components/tasks/TaskList';
import KanbanBoard from '../components/tasks/KanbanBoard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import PageHero from '../components/shared/PageHero';

export const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('board');
  const [courseFilter, setCourseFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksResult, coursesResult] = await Promise.all([
        taskService.getAllTasks({ size: 500 }),
        courseService.getAllCourses({ size: 100 }),
      ]);
      setTasks(tasksResult.content);
      setCourses(coursesResult.content);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTaskUpdated = (updatedTask) => {
    setTasks((current) => current.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
  };

  const handleTaskDeleted = (taskId) => {
    setTasks((current) => current.filter((task) => task.id !== taskId));
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (courseFilter === 'personal' && task.courseId) return false;
      if (courseFilter !== 'all' && courseFilter !== 'personal' && String(task.courseId) !== courseFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (view === 'list') {
        if (statusFilter === 'active' && task.completed) return false;
        if (statusFilter === 'completed' && !task.completed) return false;
      }
      return true;
    });
  }, [tasks, courseFilter, priorityFilter, statusFilter, view]);

  return (
    <div className="accent-amber w-full px-4 py-10">
      <PageHero
        icon={ListTodo}
        title="Tasks"
        subtitle="Every task, across every project."
        action={
          <div className="flex gap-1 rounded-lg border border-border/80 bg-card p-1">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-4 w-4" />
              List
            </button>
            <button
              type="button"
              onClick={() => setView('board')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === 'board' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Columns3 className="h-4 w-4" />
              Board
            </button>
          </div>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="sm:w-[200px]">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            <SelectItem value="personal">Personal only</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={String(course.id)}>{course.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="sm:w-[160px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>

        {view === 'list' && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-border/80 bg-card" />
          ))}
        </div>
      ) : view === 'list' ? (
        <TaskList
          tasks={filteredTasks}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
          emptyMessage="No tasks match these filters."
        />
      ) : (
        <KanbanBoard
          tasks={filteredTasks}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
        />
      )}
    </div>
  );
};

export default TasksPage;
