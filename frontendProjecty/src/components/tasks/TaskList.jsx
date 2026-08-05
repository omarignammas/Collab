import TaskItem from './TaskItem';

export const TaskList = ({ tasks, onTaskUpdated, onTaskDeleted, emptyMessage = 'No tasks yet. Create your first task!' }) => {
  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border/70 py-12 text-center">
        <p className="text-muted-foreground">
          {emptyMessage}
        </p>
      </div>
    );
  }

  const incompleteTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);

  return (
    <div className="space-y-6">
      {incompleteTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="section-header">
            to do ({incompleteTasks.length})
          </h3>
          <div className="space-y-2">
            {incompleteTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onTaskUpdated={onTaskUpdated}
                onTaskDeleted={onTaskDeleted}
              />
            ))}
          </div>
        </div>
      )}

      {completedTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="section-header">
            completed ({completedTasks.length})
          </h3>
          <div className="space-y-2">
            {completedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onTaskUpdated={onTaskUpdated}
                onTaskDeleted={onTaskDeleted}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;
