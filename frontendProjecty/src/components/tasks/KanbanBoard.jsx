import { useState } from 'react';
import TaskItem from './TaskItem';
import taskService from '../../services/taskService';
import { isOverdueTask } from '../../lib/taskDates';

const COLUMNS = [
  { key: 'todo', label: 'to do', filter: (t) => !t.completed && !isOverdueTask(t) },
  { key: 'in-progress', label: 'in progress', filter: (t) => !t.completed && isOverdueTask(t) },
  { key: 'done', label: 'done', filter: (t) => t.completed },
];

export const KanbanBoard = ({ tasks, onTaskUpdated, onTaskDeleted }) => {
  const [dragOverCol, setDragOverCol] = useState(null);

  const handleDrop = async (e, columnKey) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = Number(e.dataTransfer.getData('text/plain'));
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const shouldBeCompleted = columnKey === 'done';
    if (task.completed !== shouldBeCompleted) {
      try {
        const updated = await taskService.markTaskCompleted(taskId);
        onTaskUpdated(updated);
      } catch (error) {
        console.error('Error updating task via board:', error);
      }
    }
  };

  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">
        Drag a card into <span className="font-medium text-foreground">Done</span> to complete it, or back out to reopen it.
        To Do vs In Progress is based on due date — a task moves to In Progress once its deadline has passed.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter(col.filter);
          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(col.key);
              }}
              onDragLeave={() => setDragOverCol((c) => (c === col.key ? null : c))}
              onDrop={(e) => handleDrop(e, col.key)}
              className={`flex min-h-[240px] flex-col gap-2 rounded-xl border border-dashed p-3 transition-colors ${
                dragOverCol === col.key ? 'border-primary bg-primary/5' : 'border-border/80'
              }`}
            >
              <div className="mb-1 flex items-center justify-between px-1">
                <span className="section-header">{col.label}</span>
                <span className="font-numeric text-xs text-muted-foreground">{colTasks.length}</span>
              </div>

              {colTasks.length === 0 && (
                <p className="px-1 text-xs text-muted-foreground">Nothing here.</p>
              )}

              {colTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', String(task.id))}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <TaskItem task={task} onTaskUpdated={onTaskUpdated} onTaskDeleted={onTaskDeleted} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanBoard;
