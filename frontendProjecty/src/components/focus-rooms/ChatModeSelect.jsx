import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CHAT_MODE_LABEL } from '../../lib/chatModes';

const OPTIONS = Object.entries(CHAT_MODE_LABEL).map(([value, label]) => ({ value, label }));

export const ChatModeSelect = ({ value, onChange, className = '' }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className={className}>
      <SelectValue placeholder="Chat mode" />
    </SelectTrigger>
    <SelectContent>
      {OPTIONS.map((o) => (
        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default ChatModeSelect;
