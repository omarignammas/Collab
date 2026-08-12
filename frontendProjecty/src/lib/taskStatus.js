export const TASK_STATUS = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
};

export const getTaskStatus = (task) => {
  if (task.completed || task.status === TASK_STATUS.DONE) return TASK_STATUS.DONE;
  if (task.status === TASK_STATUS.IN_PROGRESS) return TASK_STATUS.IN_PROGRESS;
  return TASK_STATUS.TODO;
};
