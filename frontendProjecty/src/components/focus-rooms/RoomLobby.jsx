import { useState } from 'react';
import { Timer, Copy, Lock, Play, UserPlus, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { useToast } from '../../hooks/use-toast';
import ParticipantRow from './ParticipantRow';
import ChatModeSelect from './ChatModeSelect';
import FriendPicker from './FriendPicker';
import { CHAT_MODE_LABEL } from '../../lib/chatModes';
import focusRoomService from '../../services/focusRoomService';

export const RoomLobby = ({ room, isHost, userEmail, onStart, onChatModeChange, connected }) => {
  const { toast } = useToast();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteUserIds, setInviteUserIds] = useState([]);
  const [inviting, setInviting] = useState(false);

  const handleCopyLink = () => {
    const link = `${window.location.origin}/focus-rooms/${room.code}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copied', description: link });
  };

  const handleInvite = async () => {
    setInviting(true);
    try {
      for (const userId of inviteUserIds) {
        await focusRoomService.inviteToRoom(room.code, userId);
      }
      toast({ title: 'Invites sent' });
      setInviteUserIds([]);
      setIsInviteOpen(false);
    } catch (err) {
      toast({ title: 'Could not invite', description: err.response?.data?.message, variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  const alreadyInvolvedIds = room.participants.map((p) => p.userId);

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-2xl border border-border/60 bg-card shadow-ios">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 p-5">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Timer className="h-4 w-4 shrink-0" />
              Focus Room · Code: <span className="font-numeric font-semibold text-foreground">{room.code}</span>
            </p>
            <h2 className="mt-1 truncate text-xl font-semibold text-foreground">{room.name}</h2>
            {room.scheduledFor && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                Scheduled for {format(new Date(room.scheduledFor), 'PPP p')}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {room.locked && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> Locked
              </span>
            )}
            <Button size="sm" variant="outline" onClick={handleCopyLink}>
              <Copy className="mr-2 h-3.5 w-3.5" />
              Copy Link
            </Button>
          </div>
        </div>

        <div className="border-b border-border/60 p-5">
          <p className="section-header mb-3">round settings</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span className="text-muted-foreground">Work <span className="font-numeric font-medium text-foreground">{room.workMinutes}m</span></span>
            <span className="text-muted-foreground">Break <span className="font-numeric font-medium text-foreground">{room.breakMinutes}m</span></span>
            <span className="text-muted-foreground">Rounds <span className="font-numeric font-medium text-foreground">{room.totalRounds}</span></span>
            <span className="text-muted-foreground">Long <span className="font-numeric font-medium text-foreground">{room.longBreakMinutes}m</span></span>
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-xs text-muted-foreground">Chat during focus blocks</p>
            {isHost ? (
              <ChatModeSelect value={room.chatMode} onChange={onChatModeChange} className="w-full sm:w-64" />
            ) : (
              <p className="text-sm font-medium text-foreground">{CHAT_MODE_LABEL[room.chatMode]}</p>
            )}
          </div>
        </div>

        <div className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="section-header">in lobby ({room.participants.length})</p>
            {isHost && (
              <Button size="sm" variant="outline" onClick={() => setIsInviteOpen(true)}>
                <UserPlus className="mr-2 h-3.5 w-3.5" />
                Invite
              </Button>
            )}
          </div>
          <div className="divide-y divide-border/40">
            {room.participants.map((p) => (
              <ParticipantRow key={p.userId} participant={p} roomStatus={room.status} isMe={p.email === userEmail} />
            ))}
          </div>
        </div>

        <div className="flex justify-center border-t border-border/60 p-5">
          {isHost ? (
            <Button size="lg" onClick={onStart} disabled={!connected}>
              <Play className="mr-2 h-4 w-4" />
              Start Session
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Waiting for the host to start the session…</p>
          )}
        </div>
      </div>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite friends</DialogTitle>
            <DialogDescription>They'll get a notification and show up here once invited.</DialogDescription>
          </DialogHeader>
          <FriendPicker selected={inviteUserIds} onChange={setInviteUserIds} excludeUserIds={alreadyInvolvedIds} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviting || inviteUserIds.length === 0}>
              {inviting ? 'Inviting...' : 'Send Invites'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoomLobby;
