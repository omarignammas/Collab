import { useState, useEffect, useMemo } from 'react';
import { Home, ListTodo, GraduationCap, BookOpen, Bell, StickyNote, BarChart3 } from 'lucide-react';
import taskService from '../services/taskService';
import TaskList from '../components/tasks/TaskList';
import CreateTaskDialog from '../components/tasks/CreateTaskDialog';
import CreateNoteDialog from '../components/notes/CreateNoteDialog';
import { Card, CardContent } from '../components/ui/card';
import PageHero from '../components/shared/PageHero';
import Callout from '../components/shared/Callout';
import { todayStr, tomorrowStr, weekEndStr, monthEndStr, isOverdueTask, PRIORITY_ORDER } from '../lib/taskDates';

const TABS = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'Month' },
  { key: 'priority', label: 'By Priority' },
];

const EMPTY_MESSAGES = {
  today: 'Nothing due today.',
  tomorrow: 'Nothing due tomorrow.',
  week: 'Nothing due this week.',
  month: 'Nothing due this month.',
  priority: 'No open tasks.',
};

const QUICK_ACTIONS = [
  { key: 'task', label: 'Task', icon: ListTodo, type: 'PERSONAL' },
  { key: 'exam', label: 'Exam', icon: GraduationCap, type: 'EXAM' },
  { key: 'reading', label: 'Reading', icon: BookOpen, type: 'READING' },
  { key: 'reminder', label: 'Reminder', icon: Bell, type: 'PERSONAL' },
];

const StatRow = ({ label, value, accent }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className={`font-numeric font-semibold ${accent || 'text-foreground'}`}>{value}</span>
  </div>
);

export const DashboardPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today');
  const [quickTaskType, setQuickTaskType] = useState(null);
  const [isNoteOpen, setIsNoteOpen] = useState(false);

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

  const stats = useMemo(() => {
    const today = todayStr();
    const weekEnd = weekEndStr();
    return {
      dueToday: tasks.filter((t) => !t.completed && t.dueDate === today).length,
      dueThisWeek: tasks.filter((t) => !t.completed && t.dueDate && t.dueDate >= today && t.dueDate <= weekEnd).length,
      overdue: tasks.filter(isOverdueTask).length,
      inProgress: tasks.filter((t) => !t.completed).length,
      completed: tasks.filter((t) => t.completed).length,
    };
  }, [tasks]);

  const tabTasks = useMemo(() => {
    const today = todayStr();
    const tomorrow = tomorrowStr();
    const weekEnd = weekEndStr();
    const monthEnd = monthEndStr();

    switch (activeTab) {
      case 'today':
        return tasks.filter((t) => t.dueDate === today);
      case 'tomorrow':
        return tasks.filter((t) => t.dueDate === tomorrow);
      case 'week':
        return tasks.filter((t) => t.dueDate && t.dueDate >= today && t.dueDate <= weekEnd);
      case 'month':
        return tasks.filter((t) => t.dueDate && t.dueDate >= today && t.dueDate <= monthEnd);
      case 'priority':
        return [...tasks]
          .filter((t) => !t.completed)
          .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
      default:
        return tasks;
    }
  }, [tasks, activeTab]);

  return (
    <div className="accent-amber w-full px-4 py-10">
      <PageHero icon={Home} title="Dashboard" subtitle="Everything due, at a glance." />

      <div className="mb-6">
        <Callout>
          Tabs below are saved views over the same task list — switching them filters by due date or priority, it doesn't duplicate anything.
        </Callout>
      </div>

      <div className="mb-8">
        <p className="section-header mb-3">
          <ListTodo className="h-4 w-4 text-primary" />
          quick actions
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => setQuickTaskType(action.type)}
              className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm font-medium text-foreground shadow-ios-sm transition-all duration-150 hover:border-primary/50 hover:bg-accent active:scale-[0.98]"
            >
              <action.icon className="h-4 w-4 text-primary" />
              {action.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsNoteOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm font-medium text-foreground shadow-ios-sm transition-all duration-150 hover:border-primary/50 hover:bg-accent active:scale-[0.98]"
          >
            <StickyNote className="h-4 w-4 text-primary" />
            Note
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <div className="mb-6 flex flex-wrap gap-1 rounded-full bg-muted/70 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-150 ${
                  activeTab === tab.key
                    ? 'bg-card text-foreground shadow-ios-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl border border-border/60 bg-card" />
              ))}
            </div>
          ) : (
            <TaskList
              tasks={tabTasks}
              onTaskUpdated={fetchTasks}
              onTaskDeleted={fetchTasks}
              emptyMessage={EMPTY_MESSAGES[activeTab]}
            />
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-5">
              <p className="section-header">
                <BarChart3 className="h-4 w-4 text-primary" />
                stats
              </p>
              <StatRow label="Due Today" value={stats.dueToday} />
              <StatRow label="Due This Week" value={stats.dueThisWeek} />
              <StatRow label="Overdue" value={stats.overdue} accent="text-destructive" />
              <StatRow label="In Progress" value={stats.inProgress} />
              <StatRow label="Completed" value={stats.completed} accent="text-[hsl(var(--status-done-fg))]" />
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateTaskDialog
        open={!!quickTaskType}
        defaultType={quickTaskType}
        onOpenChange={(open) => !open && setQuickTaskType(null)}
        onTaskCreated={() => {
          setQuickTaskType(null);
          fetchTasks();
        }}
      />

      <CreateNoteDialog
        open={isNoteOpen}
        onOpenChange={setIsNoteOpen}
        onNoteCreated={() => setIsNoteOpen(false)}
      />
    </div>
  );
};

export default DashboardPage;
