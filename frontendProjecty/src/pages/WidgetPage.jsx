import { useEffect, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import { DoorOpen, FolderKanban, Loader2, MessageCircle, Mic, Square, Timer, Users, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { CircularProgress } from '../components/shared/CircularProgress';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import assistantCommandService from '../services/assistantCommandService';

const sendAction = (action, extra) => {
  if (isTauri()) emit('widget-action', { action, ...extra });
};

export const WidgetPage = () => {
  const [session, setSession] = useState(null);
  const [assistantResult, setAssistantResult] = useState(null);

  // The widget mic is a direct command surface. Room chat keeps its own voice
  // flow; this surface executes the small, safe set of app commands locally
  // through the authenticated API and leaves unsupported requests untouched.
  const { state: voiceState, toggleRecording } = useVoiceRecorder({
    onTranscribed: async (trimmed) => {
      setAssistantResult({ text: `You said: ${trimmed}`, kind: 'working' });
      try {
        const result = await assistantCommandService.execute(trimmed);
        setAssistantResult(result);
      } catch (error) {
        setAssistantResult({
          text: error.response?.data?.message || 'I could not complete that command. Please try again.',
          kind: 'error',
        });
      }
    },
    onError: () => setAssistantResult({ text: 'Microphone access or transcription failed. Please try again.', kind: 'error' }),
  });

  // This window is created with transparent:true at the OS level, but the
  // app's base stylesheet paints body/html with the theme's solid background
  // color on every route — override just here so the real window
  // transparency (and native vibrancy blur) shows through instead of a flat
  // rectangle behind the rounded card.
  useEffect(() => {
    const { body, documentElement: html } = document;
    const prevBody = body.style.background;
    const prevHtml = html.style.background;
    body.style.background = 'transparent';
    html.style.background = 'transparent';
    return () => {
      body.style.background = prevBody;
      html.style.background = prevHtml;
    };
  }, []);

  useEffect(() => {
    const handleShortcut = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        toggleRecording();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [toggleRecording]);

  useEffect(() => {
    if (!isTauri()) return undefined;
    const unlistenUpdate = listen('session-update', (event) => setSession(event.payload));
    const unlistenClear = listen('session-cleared', () => setSession(null));
    return () => {
      unlistenUpdate.then((fn) => fn());
      unlistenClear.then((fn) => fn());
    };
  }, []);

  return (
    <div className="h-screen w-screen bg-transparent">
      <div className="flex h-full w-full flex-col gap-3 rounded-[28px] border border-border/50 bg-card/75 p-4 shadow-ios-lg ring-1 ring-black/5 backdrop-blur-2xl dark:ring-white/5">
        {/* Branded header, like a Control Center module title — identifies
            which app owns this popover at a glance, matching the native
            "Wi-Fi" / "Sound" card headers this is modeled after. */}
        <div className="flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-[7px] bg-primary text-primary-foreground">
              <FolderKanban className="h-3 w-3" />
            </div>
            <span className="text-[11px] font-semibold tracking-tight text-foreground">Collab</span>
          </div>
          {session && !assistantResult && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--chart-4))]" />
              Live
            </span>
          )}
        </div>

        {assistantResult ? (
          <div className="flex flex-1 flex-col justify-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>{assistantResult.kind === 'working' ? 'Collab is working...' : 'Collab assistant'}</span>
            </div>
            <p className="rounded-2xl bg-muted/60 px-3 py-3 text-xs leading-relaxed text-foreground/85">
              {assistantResult.text}
            </p>
            <button
              type="button"
              onClick={() => setAssistantResult(null)}
              className="text-center text-[10px] font-medium text-muted-foreground hover:text-foreground"
            >
              Back to widget
            </button>
          </div>
        ) : session ? (
          <>
            <p className="shrink-0 text-center text-xs font-medium text-foreground/90">{session.phaseLabel}</p>

            <div className="flex flex-1 items-center justify-center">
              <CircularProgress percentage={session.percentage} size={124} strokeWidth={9} color="orange">
                <div className="flex flex-col items-center">
                  <p className="font-numeric text-2xl font-bold tabular-nums text-foreground">{session.remainingLabel}</p>
                  <p className="text-[10px] text-muted-foreground">remaining</p>
                </div>
              </CircularProgress>
            </div>

            {session.roomCode && (
              <div className="flex shrink-0 items-center justify-center gap-1 text-[10px] text-muted-foreground">
                <Users className="h-3 w-3" />
                <span className="font-numeric">{session.roomCode}</span>
              </div>
            )}

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => sendAction('open-chat')}
                title="Open chat"
                className="flex flex-1 items-start gap-1.5 rounded-2xl bg-muted/60 px-3 py-2 text-left transition-colors hover:bg-muted"
              >
                <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="line-clamp-2 text-xs leading-snug text-foreground/80">
                  {voiceState === 'transcribing' ? 'Sending…' : session.latestMessage || 'No messages yet'}
                </p>
              </button>
              <button
                type="button"
                onClick={toggleRecording}
                disabled={voiceState === 'transcribing'}
                title={voiceState === 'recording' ? 'Stop command' : 'Speak a Collab command'}
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  voiceState === 'recording'
                    ? 'border-destructive/40 bg-destructive/10 text-destructive'
                    : 'border-border/60 bg-secondary text-foreground hover:bg-secondary/70'
                }`}
              >
                {voiceState === 'recording' && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-destructive/20" />
                )}
                {voiceState === 'transcribing' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : voiceState === 'recording' ? (
                  <Square className="relative h-3 w-3 fill-current" />
                ) : (
                  <Mic className="relative h-3.5 w-3.5" />
                )}
              </button>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 rounded-full"
                onClick={() => sendAction('leave')}
              >
                <DoorOpen className="h-3.5 w-3.5" />
                Leave
              </Button>
              {session.isHost && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 rounded-full bg-destructive/10 text-destructive shadow-none hover:bg-destructive/20"
                  onClick={() => sendAction('end')}
                >
                  <Square className="h-3.5 w-3.5" />
                  End
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Timer className="h-6 w-6" />
            <p className="text-xs">No active focus session</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WidgetPage;
