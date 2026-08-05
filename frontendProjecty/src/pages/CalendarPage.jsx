import { useState, useEffect, useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import taskService from '../services/taskService';
import TaskList from '../components/tasks/TaskList';
import { parseLocalDate, isOverdueTask } from '../lib/taskDates';
import PageHero from '../components/shared/PageHero';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

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

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach((task) => {
      if (!task.dueDate) return;
      (map[task.dueDate] = map[task.dueDate] || []).push(task);
    });
    return map;
  }, [tasks]);

  const selectedTasks = selectedDay ? tasksByDate[selectedDay] || [] : [];
  const today = new Date();

  return (
    <div className="accent-blue w-full px-4 py-10">
      <PageHero
        icon={CalendarDays}
        title="Calendar"
        subtitle={format(month, 'MMMM yyyy')}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setMonth((m) => subMonths(m, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMonth(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="h-96 animate-pulse rounded-xl border border-border/80 bg-card" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card">
          <div className="grid grid-cols-7 border-b border-border/80 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayTasks = tasksByDate[dateStr] || [];
              const inMonth = isSameMonth(day, month);
              const isToday = isSameDay(day, today);

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDay(dateStr)}
                  className={`flex h-32 flex-col items-stretch gap-1 border-b border-r border-border/60 p-1.5 text-left align-top transition-colors hover:bg-accent ${
                    inMonth ? '' : 'opacity-40'
                  }`}
                >
                  <span
                    className={`mb-0.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${
                      isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
                    {dayTasks.slice(0, 3).map((task) => {
                      const chipClass = task.completed
                        ? 'pill-done'
                        : isOverdueTask(task)
                          ? 'pill-overdue'
                          : 'pill-in-progress';
                      return (
                        <div
                          key={task.id}
                          className={`truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${chipClass} ${task.completed ? 'line-through opacity-70' : ''}`}
                        >
                          {task.title}
                        </div>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <span className="px-1 text-[10px] text-muted-foreground">+{dayTasks.length - 3} more</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedDay ? format(parseLocalDate(selectedDay), 'PPPP') : ''}</DialogTitle>
          </DialogHeader>
          <TaskList
            tasks={selectedTasks}
            onTaskUpdated={fetchTasks}
            onTaskDeleted={fetchTasks}
            emptyMessage="Nothing due this day."
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarPage;
