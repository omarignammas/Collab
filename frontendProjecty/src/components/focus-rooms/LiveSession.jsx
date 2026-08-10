import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DoorOpen, EyeOff, MonitorCog, Square } from 'lucide-react';
import { Button } from '../ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import ParticipantRow from './ParticipantRow';
import ChatPanel from './ChatPanel';
import SessionNotes from './SessionNotes';
import { CircularProgress } from '../shared/CircularProgress';
import { Checkbox } from '../ui/checkbox';

const PHASE_LABEL = {
  WORK: 'Focus',
  BREAK: 'Break',
  LONG_BREAK: 'Long Break',
};

const formatRemaining = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const LiveSession = ({
  room,
  userEmail,
  isHost,
  remaining,
  ringPercentage,
  onEnd,
  onLeave,
  sendHand,
  sendChat,
  sendChatMode,
  shareFocusSignal,
  onShareFocusSignalChange,
  desktopTrackingEnabled,
}) => {
  const [activeTab, setActiveTab] = useState('chat');

  const me = room.participants.find((p) => p.email === userEmail);
  const inFocusBlock = room.currentPhase === 'WORK';

  return (
    <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]" style={{ minHeight: '480px' }}>
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-ios">
        <div className="shrink-0 border-b border-border/60 p-5">
          <AnimatePresence mode="wait">
            <motion.p
              key={room.currentPhase}
              className="section-header"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <span className={`h-2 w-2 rounded-full ${inFocusBlock ? 'bg-destructive' : 'bg-[hsl(var(--status-in-progress-fg))]'}`} />
              {PHASE_LABEL[room.currentPhase] || room.currentPhase} · Round {room.currentRound}/{room.totalRounds}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 flex-col items-center justify-center gap-1 p-8">
          <motion.div
            key={room.currentPhase}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <CircularProgress percentage={ringPercentage} size={220} strokeWidth={12} color={inFocusBlock ? 'orange' : 'blue'}>
              <div className="flex flex-col items-center">
                <p className="font-numeric text-4xl font-bold tabular-nums text-foreground">{formatRemaining(remaining)}</p>
                <p className="text-xs text-muted-foreground">remaining</p>
              </div>
            </CircularProgress>
          </motion.div>
        </div>

        <div className="flex shrink-0 justify-center gap-3 border-t border-border/60 p-5">
          <Button variant="outline" onClick={onLeave}>
            <DoorOpen className="mr-2 h-4 w-4" />
            Leave
          </Button>
          {isHost && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:text-destructive">
                  <Square className="mr-2 h-4 w-4" />
                  End Session
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>End this session for everyone?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This ends the session early for all participants. Everyone still focusing gets credit for the
                    time elapsed in the current round, and the recap shows right away.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onEnd} className="bg-destructive hover:bg-destructive/90">
                    End Session
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {inFocusBlock && (
          <div className="shrink-0 border-t border-border/60 px-5 py-3">
            {desktopTrackingEnabled ? (
              <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
                <Checkbox checked={shareFocusSignal} onCheckedChange={(value) => onShareFocusSignalChange(Boolean(value))} />
                <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5 text-xs font-medium text-foreground"><MonitorCog className="h-3.5 w-3.5 text-primary" />Share focus signal</span><span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">Shares only a broad status like Deep work, never your app name or content.</span></span>
              </label>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground"><EyeOff className="h-3.5 w-3.5 shrink-0" />Enable Desktop activity in Settings to share an optional focus signal.</div>
            )}
          </div>
        )}

        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto border-t border-border/60 p-5">
          <p className="section-header mb-2">participants ({room.participants.length})</p>
          <div className="divide-y divide-border/40">
            {room.participants.map((p) => (
              <ParticipantRow key={p.userId} participant={p} roomStatus={room.status} isMe={p.email === userEmail} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex h-full min-h-0 min-w-0 flex-col gap-2 overflow-hidden">
        <div className="flex shrink-0 gap-1 rounded-full bg-muted/70 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
              activeTab === 'chat' ? 'bg-card text-foreground shadow-ios-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
              activeTab === 'notes' ? 'bg-card text-foreground shadow-ios-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Notes
          </button>
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          {activeTab === 'chat' ? (
            <ChatPanel
              messages={room.recentMessages}
              inFocusBlock={inFocusBlock}
              chatMode={room.chatMode}
              isHost={isHost}
              currentUserEmail={userEmail}
              onChatModeChange={sendChatMode}
              onSend={sendChat}
              onRaiseHand={sendHand}
              handRaised={me?.handRaised}
            />
          ) : (
            <SessionNotes roomCode={room.code} />
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveSession;
