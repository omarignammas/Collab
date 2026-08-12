import { useState } from 'react';
import TaskItem from './TaskItem';
import taskService from '../../services/taskService';
import { getTaskStatus, TASK_STATUS } from '../../lib/taskStatus';
import { useToast } from '../../hooks/use-toast';

const COLUMNS = [
  { key: TASK_STATUS.TODO, label: 'to do' },
  { key: TASK_STATUS.IN_PROGRESS, label: 'in progress' },
  { key: TASK_STATUS.DONE, label: 'done' },
];

export const KanbanBoard = ({ tasks, onTaskUpdated, onTaskDeleted }) => {
  const [dragOverCol, setDragOverCol] = useState(null);
  const [movingTaskId, setMovingTaskId] = useState(null);
  const { toast } = useToast();

  const handleDrop = async (e, columnKey) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = Number(e.dataTransfer.getData('text/plain'));
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (getTaskStatus(task) !== columnKey) {
      setMovingTaskId(taskId);
      try {
        const updated = await taskService.updateTaskStatus(taskId, columnKey);
        onTaskUpdated(updated);
      } catch (error) {
        console.error('Error updating task via board:', error);
        toast({
          title: 'Could not move task',
          description: error.response?.data?.message || 'Please try again.',
          variant: 'destructive',
        });
      } finally {
        setMovingTaskId(null);
      }
    }
  };

  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">
        Drag cards between columns to update their workflow. Overdue is shown separately from status.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((task) => getTaskStatus(task) === col.key);
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
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', String(task.id));
                  }}
                  onDragEnd={() => setDragOverCol(null)}
                  className={`cursor-grab transition-opacity active:cursor-grabbing ${movingTaskId === task.id ? 'pointer-events-none opacity-50' : ''}`}
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
