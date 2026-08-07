import { format } from 'date-fns';
import focusRoomService from './focusRoomService';
import taskService from './taskService';

const today = () => format(new Date(), 'yyyy-MM-dd');

const cleanTitle = (value) => value
  .replace(/^(called|named|titled)\s+/i, '')
  .replace(/[.!?]+$/, '')
  .trim();

const formatTasks = (tasks, emptyMessage) => {
  if (!tasks.length) return emptyMessage;
  const preview = tasks.slice(0, 5).map((task) => {
    const due = task.dueDate ? ` (due ${task.dueDate})` : '';
    return `${task.title}${due}`;
  });
  const suffix = tasks.length > preview.length ? `, and ${tasks.length - preview.length} more` : '';
  return `${tasks.length} task${tasks.length === 1 ? '' : 's'}: ${preview.join('; ')}${suffix}.`;
};

export const assistantCommandService = {
  async execute(rawCommand) {
    const command = rawCommand.trim();
    const lower = command.toLowerCase();

    if (/(overdue|past due|late) tasks?/.test(lower)) {
      const result = await taskService.getAllTasks({ size: 100, sortField: 'dueDate', direction: 'ASC' });
      const tasks = (result.content || []).filter((task) => !task.completed && task.dueDate && task.dueDate < today());
      return { text: formatTasks(tasks, 'You have no overdue tasks.'), kind: 'tasks' };
    }

    if (/(today|daily|for the day).*(tasks?|to-?dos?)|tasks?.*(today|daily)/.test(lower)) {
      const result = await taskService.getAllTasks({ size: 100, sortField: 'dueDate', direction: 'ASC' });
      const tasks = (result.content || []).filter((task) => !task.completed && task.dueDate === today());
      return { text: formatTasks(tasks, 'You have no incomplete tasks due today.'), kind: 'tasks' };
    }

    const specificTaskMatch = command.match(/(?:show|list|find|open) (?:the )?(?:task|daily task)\s+(.+)$/i);
    if (specificTaskMatch) {
      const result = await taskService.getAllTasks({ size: 100, sortField: 'dueDate', direction: 'ASC' });
      const query = specificTaskMatch[1].toLowerCase().trim();
      const tasks = (result.content || []).filter((task) => task.title.toLowerCase().includes(query));
      return { text: formatTasks(tasks, `I could not find a task matching “${specificTaskMatch[1].trim()}”.`), kind: 'tasks' };
    }

    const taskMatch = command.match(/(?:add|create|make) (?:a )?task(?: called| named| titled)?\s+(.+?)(?:\s+due\s+(today|tomorrow|in \d+ days?|on \d{4}-\d{2}-\d{2}))?$/i);
    if (taskMatch) {
      const title = cleanTitle(taskMatch[1]);
      const duePhrase = taskMatch[2]?.toLowerCase();
      let dueDate = null;
      if (duePhrase === 'today') dueDate = today();
      if (duePhrase === 'tomorrow') {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        dueDate = format(date, 'yyyy-MM-dd');
      }
      if (/^on \d{4}-\d{2}-\d{2}$/.test(duePhrase || '')) dueDate = duePhrase.slice(3);
      const task = await taskService.createTask({ title, dueDate, priority: 'MEDIUM', type: 'PERSONAL' });
      return { text: `Created the task “${task.title}”${task.dueDate ? ` for ${task.dueDate}` : ''}.`, kind: 'success' };
    }

    const roomMatch = command.match(/(?:create|start|make) (?:a )?(?:focus )?room(?: called| named| titled)?\s+(.+)$/i);
    if (roomMatch) {
      const name = cleanTitle(roomMatch[1]);
      const room = await focusRoomService.createRoom({
        name,
        workMinutes: 25,
        breakMinutes: 5,
        totalRounds: 4,
        longBreakMinutes: 15,
        chatMode: 'CLOSED_FOCUS',
        inviteUserIds: [],
        scheduledFor: null,
        aiReportEnabled: true,
      });
      return { text: `Created “${room.name}”. The room code is ${room.code}.`, kind: 'success', room };
    }

    return {
      text: 'I can create tasks or focus rooms, and list your overdue or today’s tasks. Try “create a task called Review notes due tomorrow”.',
      kind: 'help',
    };
  },
};

export default assistantCommandService;
