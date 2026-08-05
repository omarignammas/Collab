import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, CalendarOff } from 'lucide-react';
import taskService from '../services/taskService';
import TaskList from '../components/tasks/TaskList';
import { isOverdueTask, isUnscheduledTask } from '../lib/taskDates';
import PageHero from '../components/shared/PageHero';

export const OverduePage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const result = await taskService.getAllTasks({ size: 500 });
      setTasks(result.content);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const overdueTasks = useMemo(() => tasks.filter(isOverdueTask), [tasks]);
  const unscheduledTasks = useMemo(() => tasks.filter(isUnscheduledTask), [tasks]);

  return (
    <div className="accent-coral w-full px-4 py-10">
      <PageHero
        icon={AlertTriangle}
        title="Overdue & Unscheduled"
        subtitle="Nothing here falls through the cracks silently."
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-border/80 bg-card" />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="section-header mb-3 !text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              overdue ({overdueTasks.length})
            </h2>
            <TaskList
              tasks={overdueTasks}
              onTaskUpdated={fetchTasks}
              onTaskDeleted={fetchTasks}
              emptyMessage="Nothing overdue. You're on top of it."
            />
          </section>

          <section>
            <h2 className="section-header mb-3">
              <CalendarOff className="h-3.5 w-3.5" />
              unscheduled ({unscheduledTasks.length})
            </h2>
            <TaskList
              tasks={unscheduledTasks}
              onTaskUpdated={fetchTasks}
              onTaskDeleted={fetchTasks}
              emptyMessage="No unscheduled tasks."
            />
          </section>
        </div>
      )}
    </div>
  );
};

export default OverduePage;
