import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import TaskItem from '../tasks/TaskItem';

const GROUP_ORDER = ['ASSIGNMENT', 'EXAM', 'LAB_REPORT', 'READING', 'PERSONAL'];

const GROUP_LABELS = {
  ASSIGNMENT: 'assignments',
  EXAM: 'exams',
  LAB_REPORT: 'lab reports',
  READING: 'readings',
  PERSONAL: 'personal',
};

export const CourseBackpack = ({ tasks, onTaskUpdated, onTaskDeleted }) => {
  const [collapsed, setCollapsed] = useState(new Set());

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-12 text-center">
        <p className="text-muted-foreground">No tasks in this course yet.</p>
      </div>
    );
  }

  const groups = GROUP_ORDER
    .map((type) => ({ type, items: tasks.filter((t) => t.type === type) }))
    .filter((group) => group.items.length > 0);

  const toggleGroup = (type) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const isCollapsed = collapsed.has(group.type);
        return (
          <div key={group.type} className="space-y-3">
            <button
              type="button"
              onClick={() => toggleGroup(group.type)}
              className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary"
            >
              {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {GROUP_LABELS[group.type]} ({group.items.length})
            </button>

            {!isCollapsed && (
              <div className="space-y-2">
                {group.items.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onTaskUpdated={onTaskUpdated}
                    onTaskDeleted={onTaskDeleted}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CourseBackpack;
