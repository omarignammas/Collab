import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Hand, Send, MessageSquare, Smile, Sparkles, ExternalLink, Mic, Square, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import Avatar from '../shared/Avatar';
import ChatModeSelect from './ChatModeSelect';
import markdownComponents from '../shared/markdownComponents';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { useToast } from '../../hooks/use-toast';

// Slightly denser than the shared page-level defaults — this renders inline in a
// chat row, not a full page.
const aiMarkdownComponents = {
  ...markdownComponents,
  p: (props) => <p className="mb-1.5 text-sm leading-relaxed last:mb-0" {...props} />,
  ul: (props) => <ul className="mb-1.5 ml-4 list-disc space-y-0.5 text-sm last:mb-0" {...props} />,
  ol: (props) => <ol className="mb-1.5 ml-4 list-decimal space-y-0.5 text-sm last:mb-0" {...props} />,
  li: (props) => <li className="text-sm" {...props} />,
  h1: (props) => <p className="mb-1 text-sm font-bold last:mb-0" {...props} />,
  h2: (props) => <p className="mb-1 text-sm font-bold last:mb-0" {...props} />,
  h3: (props) => <p className="mb-1 text-sm font-semibold last:mb-0" {...props} />,
  table: ({ children }) => (
    <div className="thin-scrollbar mb-2 max-w-full overflow-x-auto rounded-lg border border-border/60">
      <table className="w-max min-w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: (props) => <th className="border-b border-r border-border/60 bg-accent/50 p-2 text-left text-xs font-semibold text-foreground last:border-r-0" {...props} />,
  td: (props) => <td className="border-b border-r border-border/60 p-2 align-top text-muted-foreground last:border-r-0" {...props} />,
  pre: (props) => <pre className="thin-scrollbar mb-2 max-w-full overflow-x-auto rounded-lg bg-muted/60 p-3 text-xs" {...props} />,
  code: (props) => <code className="rounded bg-muted/70 px-1 py-0.5 text-xs" {...props} />,
  a: ({ href, children, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2 hover:text-primary/80"
      {...props}
    >
      <ExternalLink className="h-3 w-3 shrink-0" />
      {children}
    </a>
  ),
};

const isEmojiOnly = (text) => {
  const stripped = text.replace(/\s+/g, '');
  if (!stripped) return false;
  return [...stripped].every((ch) => /\p{Extended_Pictographic}|\p{Emoji_Component}/u.test(ch));
};

// "3s" / "1m 12s" — how long Collab took to reply, shown the way the elapsed-time
// line under a reply reads in the reference screenshots ("Thought for 6 seconds"),
// except this is real elapsed wall-clock time rather than a fabricated thinking step.
const formatElapsed = (ms) => {
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 1) return 'less than a second';
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
};

export const ChatPanel = ({
  messages,
  inFocusBlock,
  chatMode,
  isHost,
  currentUserEmail,
  onChatModeChange,
  onSend,
  onRaiseHand,
  handRaised,
}) => {
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const restriction = inFocusBlock ? chatMode : 'OPEN';
  const fullyLocked = restriction === 'CLOSED_FOCUS';
  const emojiOnly = restriction === 'EMOJI_ONLY_FOCUS';

  const { state: recordingState, toggleRecording } = useVoiceRecorder({
    onTranscribed: (trimmed) => {
      // Voice is a "speak and go" flow — send straight away instead of
      // requiring a manual review + Send click, unless a focus-mode chat
      // restriction actually blocks it, in which case fall back to dropping
      // it in the composer for the user to fix by hand.
      if (fullyLocked) {
        toast({ title: 'Chat is locked', description: "Can't send messages right now.", variant: 'destructive' });
      } else if (emojiOnly && !isEmojiOnly(trimmed)) {
        setDraft((prev) => (prev.trim() ? `${prev.trim()} ${trimmed}` : trimmed));
        toast({ title: 'Emoji only right now', description: 'Edit your message before sending.' });
      } else {
        onSend(trimmed);
      }
    },
    onError: (err) => {
      if (err.name === 'NotAllowedError' || err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        const noMic = err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError';
        toast({
          title: noMic ? 'No microphone found' : 'Microphone access denied',
          description: noMic
            ? 'Connect a microphone and try again.'
            : 'Allow microphone access in system settings to use voice input.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Transcription failed',
          description: err.response?.data?.message || 'Please try again.',
          variant: 'destructive',
        });
      }
    },
  });

  const draftIsValid = useMemo(() => {
    if (!draft.trim()) return false;
    if (emojiOnly) return isEmojiOnly(draft);
    return true;
  }, [draft, emojiOnly]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (fullyLocked || !draftIsValid) return;
    onSend(draft.trim());
    setDraft('');
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-ios">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 p-4">
        <p className="section-header">
          <MessageSquare className="h-4 w-4 text-primary" />
          room chat
        </p>
        {isHost && <ChatModeSelect value={chatMode} onChange={onChatModeChange} className="h-8 w-auto text-xs" />}
      </div>

      <div ref={listRef} className="thin-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        {fullyLocked && (
          <div className="mx-2 mb-2 flex items-start gap-2 rounded-xl border border-border/50 bg-muted/40 p-3 text-xs text-muted-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Chat muted during focus — reactions only
          </div>
        )}
        {emojiOnly && (
          <div className="mx-2 mb-2 flex items-start gap-2 rounded-xl border border-border/50 bg-muted/40 p-3 text-xs text-muted-foreground">
            <Smile className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Emoji reactions only during focus
          </div>
        )}

        {messages.length === 0 && !fullyLocked && !emojiOnly && (
          <p className="text-center text-xs text-muted-foreground">No messages yet.</p>
        )}

        {messages.map((m, i) => {
          if (m.type === 'SYSTEM') {
            return (
              <p key={m.id} className="flex items-center justify-center gap-1 py-1.5 text-center text-xs text-muted-foreground">
                {m.body === 'Collab is thinking…' && <Sparkles className="h-3 w-3 shrink-0 text-primary" />}
                {m.body}
              </p>
            );
          }

          if (m.type === 'AI') {
            // The chat message immediately before this reply's "thinking" beat is the
            // one that triggered it — surface who asked (with their real avatar) and
            // how long Collab took, rather than just labeling the reply "AI".
            let askedBy = null;
            for (let j = i - 1; j >= 0; j--) {
              if (messages[j].type === 'CHAT') { askedBy = messages[j]; break; }
              if (messages[j].type === 'AI') break;
            }
            const elapsedMs = askedBy?.createdAt && m.createdAt
              ? new Date(m.createdAt).getTime() - new Date(askedBy.createdAt).getTime()
              : null;

            return (
              <div key={m.id} className="group flex min-w-0 gap-2.5 rounded-lg px-2 py-1 mt-3 hover:bg-muted/30">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-primary">Collab</span>
                    {elapsedMs != null && elapsedMs >= 0 && (
                      <span className="text-[11px] text-muted-foreground">
                        replied in {formatElapsed(elapsedMs)}
                        {askedBy && <> · to {askedBy.senderName}</>}
                      </span>
                    )}
                  </div>
                  <div className="animate-in fade-in slide-in-from-bottom-1 mt-0.5 max-w-full overflow-hidden break-words text-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={aiMarkdownComponents}>
                      {m.body}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            );
          }

          const prev = messages[i - 1];
          const isGroupStart = !prev || prev.type === 'SYSTEM' || prev.type === 'AI' || prev.senderEmail !== m.senderEmail;
          const time = m.createdAt ? format(new Date(m.createdAt), 'HH:mm') : '';
          const isMine = Boolean(currentUserEmail) && m.senderEmail === currentUserEmail;

          return (
            <div
              key={m.id}
              className={`group flex gap-2.5 rounded-lg px-2 py-0.5 hover:bg-muted/30 ${isGroupStart ? 'mt-3' : ''}`}
            >
              <div className="w-8 shrink-0">
                {isGroupStart && <Avatar name={m.senderName} avatarUrl={m.senderAvatarUrl} size="sm" />}
              </div>
              <div className="min-w-0 flex-1">
                {isGroupStart && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {isMine ? 'You' : m.senderName}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{time}</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap break-words text-sm text-foreground">{m.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="flex shrink-0 items-center gap-2 border-t border-border/60 p-3">
        <Button
          type="button"
          variant={handRaised ? 'default' : 'outline'}
          size="icon"
          className="shrink-0"
          onClick={onRaiseHand}
          title="Raise hand"
        >
          <Hand className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={recordingState === 'recording' ? 'destructive' : 'outline'}
          size="icon"
          className="relative shrink-0"
          onClick={toggleRecording}
          disabled={fullyLocked || recordingState === 'transcribing'}
          title={recordingState === 'recording' ? 'Stop recording' : 'Voice input'}
        >
          <AnimatePresence>
            {recordingState === 'recording' && (
              <motion.span
                className="absolute inset-0 rounded-lg bg-destructive/40"
                initial={{ opacity: 0.6, scale: 1 }}
                animate={{ opacity: 0, scale: 1.6 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
          </AnimatePresence>
          {recordingState === 'transcribing' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : recordingState === 'recording' ? (
            <Square className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            recordingState === 'recording'
              ? 'Listening…'
              : recordingState === 'transcribing'
                ? 'Transcribing…'
                : fullyLocked
                  ? 'Locked during focus…'
                  : emojiOnly
                    ? 'Emoji only 👍🔥🎉'
                    : 'Message the room, or just ask Collab something…'
          }
          disabled={fullyLocked}
        />
        <Button type="submit" size="icon" disabled={fullyLocked || !draftIsValid} className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default ChatPanel;
