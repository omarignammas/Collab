import { CheckCircle2, Hand } from 'lucide-react';
import Avatar from '../shared/Avatar';

const STATUS_LABEL = {
  INVITED: 'invited, not joined',
  DECLINED: 'declined',
  JOINED: 'ready',
  FOCUSING: 'focusing',
  ON_BREAK: 'on break',
  QUIT: 'quit',
  COMPLETED: 'completed',
};

const dotClass = (participant, roomStatus) => {
  switch (participant.status) {
    case 'FOCUSING':
      return 'bg-[hsl(var(--status-done-fg))]';
    case 'ON_BREAK':
      return 'bg-[hsl(var(--status-in-progress-fg))]';
    case 'QUIT':
      return 'bg-muted-foreground/50';
    case 'DECLINED':
      return 'bg-destructive/50';
    case 'INVITED':
      return 'bg-muted-foreground/30';
    case 'JOINED':
      return roomStatus === 'LOBBY' ? 'bg-[hsl(var(--status-done-fg))]' : 'bg-muted-foreground/40';
    default:
      return 'bg-muted-foreground/40';
  }
};

export const ParticipantRow = ({ participant, roomStatus, isMe }) => {
  const label = STATUS_LABEL[participant.status] || participant.status.toLowerCase();
  const name = isMe ? 'You' : participant.displayName;

  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="relative shrink-0">
          <Avatar name={participant.displayName} size="sm" />
          {participant.status === 'COMPLETED' ? (
            <CheckCircle2 className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-card text-[hsl(var(--status-done-fg))]" />
          ) : (
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-card ${dotClass(participant, roomStatus)}`}
            />
          )}
        </div>
        <span className="truncate text-sm text-foreground">
          {name}
          {participant.host && <span className="ml-1 text-xs text-muted-foreground">(host)</span>}
        </span>
        {participant.handRaised && <Hand className="h-3.5 w-3.5 shrink-0 text-primary" />}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {participant.status === 'QUIT' && participant.leftAt && (
          <span className="text-xs text-muted-foreground">
            {new Date(participant.leftAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
};

export default ParticipantRow;
