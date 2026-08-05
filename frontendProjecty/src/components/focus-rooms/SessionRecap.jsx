import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CheckCircle2, DoorOpen, Copy, RotateCcw, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import focusRoomService from '../../services/focusRoomService';
import markdownComponents from '../shared/markdownComponents';

export const SessionRecap = ({ room, userEmail }) => {
  const [rematching, setRematching] = useState(false);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!room.aiReportEnabled) {
      setReportLoading(false);
      return undefined;
    }

    let cancelled = false;
    let timeoutId;

    const poll = async () => {
      try {
        const data = await focusRoomService.getSessionReport(room.code);
        if (cancelled) return;
        setReport(data);
        if (data.status === 'PENDING') {
          timeoutId = setTimeout(poll, 3000);
        } else {
          setReportLoading(false);
        }
      } catch {
        if (!cancelled) setReportLoading(false);
      }
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [room.code, room.aiReportEnabled]);

  const totalMinutes = room.workMinutes * room.totalRounds;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const totalLabel = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const sortedParticipants = [...room.participants].sort((a, b) => b.minutesFocused - a.minutesFocused);
  const isHost = room.participants.some((p) => p.email === userEmail && p.host);

  const handleCopyRecap = () => {
    const lines = [
      `${room.name} — Session Complete (${totalLabel})`,
      ...sortedParticipants.map((p) =>
        `${p.email === userEmail ? 'You' : p.displayName}: ${p.minutesFocused} min focused — ${p.status === 'COMPLETED' ? 'completed' : 'quit'}`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    toast({ title: 'Recap copied', description: 'Paste it anywhere to share.' });
  };

  const handleRematch = async () => {
    setRematching(true);
    try {
      const newRoom = await focusRoomService.rematchRoom(room.code);
      navigate(`/focus-rooms/${newRoom.code}`);
    } catch (err) {
      toast({
        title: 'Could not start rematch',
        description: err.response?.data?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRematching(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="flex flex-col items-center rounded-2xl border border-border/60 bg-card shadow-ios p-8 text-center">
        <CheckCircle2 className="mb-3 h-8 w-8 text-[hsl(var(--status-done-fg))]" />
        <h2 className="text-xl font-semibold text-foreground">Session Complete — {totalLabel}</h2>

        <div className="mt-6 w-full divide-y divide-border/40 text-left">
          {sortedParticipants.map((p) => (
            <div key={p.userId} className="flex items-center justify-between py-2 text-sm">
              <span className="font-medium text-foreground">{p.email === userEmail ? 'You' : p.displayName}</span>
              <span className="font-numeric text-muted-foreground">{p.minutesFocused} min focused</span>
              <span className="flex items-center gap-1 text-xs">
                {p.status === 'COMPLETED' ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--status-done-fg))]" />
                    completed
                  </>
                ) : (
                  <>
                    <DoorOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    quit
                  </>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <Button variant="outline" onClick={handleCopyRecap}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Recap
          </Button>
          {isHost && (
            <Button onClick={handleRematch} disabled={rematching}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {rematching ? 'Starting...' : 'Rematch'}
            </Button>
          )}
        </div>
      </div>

      {room.aiReportEnabled && (
        <div className="mt-6 rounded-2xl border border-border/60 bg-card shadow-ios p-6 text-left">
          <p className="section-header mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            AI session report
          </p>
          {reportLoading || report?.status === 'PENDING' ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating your recap…
            </div>
          ) : report?.status === 'READY' ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {report.content}
            </ReactMarkdown>
          ) : (
            <p className="text-sm text-muted-foreground">Couldn't generate a report for this session.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SessionRecap;
