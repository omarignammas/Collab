import { useState, useEffect, useMemo } from 'react';
import { format, addDays, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { Flame, CheckCircle2, Timer, ListTodo, BarChart3 } from 'lucide-react';
import { motion as Motion, useReducedMotion } from 'motion/react';
import { Card, CardContent } from '../components/ui/card';
import taskService from '../services/taskService';
import courseService from '../services/courseService';
import focusRoomService from '../services/focusRoomService';
import TrendAreaChart from '../components/charts/TrendAreaChart';
import ActivityHeatmap from '../components/charts/ActivityHeatmap';
import StreakBarChart from '../components/charts/StreakBarChart';
import { CircularProgress } from '../components/shared/CircularProgress';
import PageHero from '../components/shared/PageHero';
import { useAuth } from '../hooks/useAuth';

const CIRCLE_COLORS = ['blue', 'purple', 'green', 'orange'];

const formatMinutes = (mins) => {
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainder = mins % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
};

const computeStreak = (completedDayStrings) => {
  const daySet = new Set(completedDayStrings);
  let cursor = new Date();
  if (!daySet.has(format(cursor, 'yyyy-MM-dd'))) {
    cursor = addDays(cursor, -1);
  }
  let streak = 0;
  while (daySet.has(format(cursor, 'yyyy-MM-dd'))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
};

const StatTile = (props) => {
  const Icon = props.icon;
  const percentage = props.percentage ?? 100;
  const color = props.color || 'blue';
  return (
    <Card className="border-border/80 bg-card">
      <CardContent className="flex flex-col items-center gap-3 p-5 text-center">
        <CircularProgress percentage={percentage} size={84} strokeWidth={6} color={color}>
          <div className="flex flex-col items-center gap-0.5 px-2">
            <Icon className="h-4 w-4 shrink-0 text-primary" />
            <span
              className="line-clamp-1 max-w-[64px] font-numeric text-base font-bold text-foreground"
              title={typeof props.value === 'string' ? props.value : undefined}
            >
              {props.value}
            </span>
          </div>
        </CircularProgress>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{props.label}</p>
          {props.sub && <p className="mt-0.5 text-xs text-muted-foreground">{props.sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export const StatsPage = () => {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [tasks, setTasks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [focusRooms, setFocusRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async (showSpinner) => {
      if (showSpinner) setLoading(true);
      try {
        const [tasksResult, coursesResult, focusRoomsResult, timeEntries] = await Promise.all([
          taskService.getAllTasks({ size: 500 }),
          courseService.getAllCourses({ size: 100 }),
          focusRoomService.getAllRooms({ size: 100 }),
          focusRoomService.getTimeEntries(),
        ]);
        if (cancelled) return;
        setTasks(tasksResult.content);
        setCourses(coursesResult.content);
        // Rooms an explicit "End Session" deleted don't come back from
        // getAllRooms anymore, but the minutes were banked separately —
        // reshaped here to look like a completed room so every chart below
        // that reduces over focusRooms picks them up without extra logic.
        const bankedAsRooms = (timeEntries || []).map((entry) => ({
          status: 'COMPLETED',
          updatedAt: entry.earnedAt,
          participants: [{ email: user?.email, minutesFocused: entry.minutesFocused }],
        }));
        setFocusRooms([...(focusRoomsResult.content || []), ...bankedAsRooms]);
      } catch (error) {
        console.error('Error fetching stats data:', error);
      } finally {
        if (!cancelled && showSpinner) setLoading(false);
      }
    };

    fetchStats(true);

    // Completing a task elsewhere and switching back to an already-open Stats
    // tab doesn't remount this page, so these numbers would otherwise sit
    // stale until a full navigation away and back — refresh quietly instead.
    const onFocus = () => fetchStats(false);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchStats(false);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const stats = useMemo(() => {
    const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');

    const dueThisWeek = tasks.filter((t) => t.dueDate && t.dueDate >= weekStart && t.dueDate <= weekEnd);
    const completedThisWeek = dueThisWeek.filter((t) => t.completed);
    const weeklyCompletionRate = dueThisWeek.length > 0
      ? Math.round((completedThisWeek.length / dueThisWeek.length) * 100)
      : 0;

    const completedDayStrings = tasks
      .filter((t) => t.completed && t.completedAt)
      .map((t) => t.completedAt.slice(0, 10));
    const streak = computeStreak(completedDayStrings);

    const weekStartDate = startOfWeek(new Date());
    const focusRoomMinutesThisWeek = focusRooms.reduce((total, room) => {
      if (room.status !== 'COMPLETED' || new Date(room.updatedAt) < weekStartDate) return total;
      const me = room.participants.find((p) => p.email === user?.email);
      return total + (me?.minutesFocused || 0);
    }, 0);

    return {
      weeklyCompletionRate,
      dueThisWeekCount: dueThisWeek.length,
      completedThisWeekCount: completedThisWeek.length,
      streak,
      totalTasks: tasks.length,
      totalCompleted: tasks.filter((t) => t.completed).length,
      focusRoomMinutesThisWeek,
    };
  }, [tasks, focusRooms, user?.email]);

  const trendData = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const key = format(d, 'yyyy-MM-dd');
      const count = tasks.filter((t) => t.completedAt && t.completedAt.slice(0, 10) === key).length;
      days.push({ label: format(d, 'MMM d'), fullLabel: format(d, 'EEEE, MMM d'), value: count });
    }
    return days;
  }, [tasks]);

  const focusHoursTrendData = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const key = format(d, 'yyyy-MM-dd');
      const minutesForDay = focusRooms.reduce((total, room) => {
        if (room.status !== 'COMPLETED' || format(new Date(room.updatedAt), 'yyyy-MM-dd') !== key) return total;
        const me = room.participants.find((p) => p.email === user?.email);
        return total + (me?.minutesFocused || 0);
      }, 0);
      days.push({
        label: format(d, 'MMM d'),
        fullLabel: format(d, 'EEEE, MMM d'),
        value: Math.round((minutesForDay / 60) * 10) / 10,
      });
    }
    return days;
  }, [focusRooms, user?.email]);

  const activityHeatmapData = useMemo(() => {
    const countsByDay = {};
    tasks.forEach((t) => {
      if (t.completed && t.completedAt) {
        const key = t.completedAt.slice(0, 10);
        countsByDay[key] = (countsByDay[key] || 0) + 1;
      }
    });

    const WEEKS = 12;
    const today = new Date();
    const todayDow = today.getDay();
    const gridStart = subDays(today, todayDow + (WEEKS - 1) * 7);

    const days = [];
    for (let i = 0; i < WEEKS * 7; i++) {
      const d = addDays(gridStart, i);
      const key = format(d, 'yyyy-MM-dd');
      days.push({ date: key, count: countsByDay[key] || 0, isFuture: d > today });
    }
    return days;
  }, [tasks]);

  const courseCompletionRates = useMemo(() => {
    return courses
      .map((course, i) => {
        const courseTasks = tasks.filter((t) => t.courseId === course.id);
        const completed = courseTasks.filter((t) => t.completed).length;
        const percentage = courseTasks.length > 0 ? Math.round((completed / courseTasks.length) * 100) : 0;
        return {
          courseId: course.id,
          label: course.title,
          percentage,
          completed,
          total: courseTasks.length,
          color: CIRCLE_COLORS[i % CIRCLE_COLORS.length],
        };
      })
      .filter((c) => c.total > 0);
  }, [courses, tasks]);

  const streakBarData = useMemo(() => {
    const completedTasksByDay = {};
    tasks.forEach((t) => {
      if (t.completed && t.completedAt) {
        const key = t.completedAt.slice(0, 10);
        (completedTasksByDay[key] = completedTasksByDay[key] || []).push(t);
      }
    });

    const minutesByDay = {};
    focusRooms.forEach((room) => {
      if (room.status !== 'COMPLETED') return;
      const key = format(new Date(room.updatedAt), 'yyyy-MM-dd');
      const me = room.participants.find((p) => p.email === user?.email);
      if (me?.minutesFocused) {
        minutesByDay[key] = (minutesByDay[key] || 0) + me.minutesFocused;
      }
    });

    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const key = format(d, 'yyyy-MM-dd');
      const dayTasks = completedTasksByDay[key] || [];
      const courseTitles = [...new Set(dayTasks.map((t) => t.courseTitle).filter(Boolean))];
      const dayCourses = courseTitles.map((title) => {
        const rate = courseCompletionRates.find((c) => c.label === title);
        return { title, percentage: rate ? rate.percentage : 0 };
      });

      days.push({
        date: key,
        active: dayTasks.length > 0,
        inCurrentStreak: false,
        tasksCompleted: dayTasks.length,
        hoursWorked: Math.round(((minutesByDay[key] || 0) / 60) * 10) / 10,
        courses: dayCourses,
      });
    }

    let cursorIdx = days.length - 1;
    if (!days[cursorIdx].active) cursorIdx -= 1;
    while (cursorIdx >= 0 && days[cursorIdx].active) {
      days[cursorIdx].inCurrentStreak = true;
      cursorIdx -= 1;
    }

    return days;
  }, [tasks, focusRooms, user?.email, courseCompletionRates]);

  const tasksByPriority = useMemo(() => {
    const order = [
      { key: 'HIGH', label: 'High', color: 'orange' },
      { key: 'MEDIUM', label: 'Medium', color: 'blue' },
      { key: 'LOW', label: 'Low', color: 'green' },
    ];
    return order.map((o) => {
      const priorityTasks = tasks.filter((t) => t.priority === o.key);
      const completed = priorityTasks.filter((t) => t.completed).length;
      return {
        key: o.key,
        label: o.label,
        color: o.color,
        percentage: priorityTasks.length > 0 ? Math.round((completed / priorityTasks.length) * 100) : 0,
        completed,
        total: priorityTasks.length,
      };
    });
  }, [tasks]);

  return (
    <div className="accent-teal w-full overflow-x-hidden px-4 py-10">
      <PageHero icon={BarChart3} title="Stats" subtitle="How the term's actually going." />

      {loading ? (
        <Motion.div
          className="space-y-6"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-border/80 bg-card" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl border border-border/80 bg-card" />
        </Motion.div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon={ListTodo}
              label="Total tasks"
              value={stats.totalTasks}
              sub={`${stats.totalCompleted} completed`}
              percentage={stats.totalTasks > 0 ? Math.round((stats.totalCompleted / stats.totalTasks) * 100) : 0}
              color="blue"
            />
            <StatTile
              icon={CheckCircle2}
              label="Weekly completion rate"
              value={`${stats.weeklyCompletionRate}%`}
              sub={`${stats.completedThisWeekCount}/${stats.dueThisWeekCount} due this week`}
              percentage={stats.weeklyCompletionRate}
              color="green"
            />
            <StatTile
              icon={Flame}
              label="Current streak"
              value={`${stats.streak} ${stats.streak === 1 ? 'day' : 'days'}`}
              percentage={Math.min(100, Math.round((stats.streak / 7) * 100))}
              color="orange"
            />
            <StatTile
              icon={Timer}
              label="Focus time this week"
              value={formatMinutes(stats.focusRoomMinutesThisWeek)}
              color="purple"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="border-border/80 bg-card">
              <CardContent className="p-5">
                <p className="section-header mb-1">task activity</p>
                <p className="mb-3 text-xs text-muted-foreground">Every day you completed something, last 12 weeks.</p>
                <ActivityHeatmap data={activityHeatmapData} />
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card">
              <CardContent className="p-5">
                <p className="section-header mb-1">streak</p>
                <p className="mb-3 text-xs text-muted-foreground">Last 30 days — highlighted bars are your current streak.</p>
                <StreakBarChart data={streakBarData} />
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/80 bg-card">
            <CardContent className="p-5">
              <p className="section-header mb-1">completions — last 14 days</p>
              <TrendAreaChart data={trendData} height={200} valueLabel="completed" />
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card">
            <CardContent className="p-5">
              <p className="section-header mb-1">focus hours — last 14 days</p>
              <p className="mb-3 text-xs text-muted-foreground">Hours spent in a Focus Room work block, per day.</p>
              <TrendAreaChart data={focusHoursTrendData} height={200} valueLabel="hours" />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="border-border/80 bg-card">
              <CardContent className="p-5">
                <p className="section-header mb-4">tasks by project</p>
                {courseCompletionRates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks assigned to a project yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {courseCompletionRates.map((course) => (
                      <div key={course.courseId} className="flex flex-col items-center gap-2 text-center">
                        <CircularProgress percentage={course.percentage} size={80} strokeWidth={7} color={course.color} />
                        <div>
                          <p className="truncate text-xs font-medium text-foreground" title={course.label}>{course.label}</p>
                          <p className="text-xs text-muted-foreground">{course.completed}/{course.total} done</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card">
              <CardContent className="p-5">
                <p className="section-header mb-4">tasks by priority</p>
                {tasksByPriority.every((p) => p.total === 0) ? (
                  <p className="text-sm text-muted-foreground">No tasks with a priority set yet.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {tasksByPriority.map((p) => (
                      <div key={p.key} className="flex flex-col items-center gap-2 text-center">
                        <CircularProgress percentage={p.percentage} size={80} strokeWidth={7} color={p.color} />
                        <div>
                          <p className="text-xs font-medium text-foreground">{p.label}</p>
                          <p className="text-xs text-muted-foreground">{p.completed}/{p.total} done</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsPage;
