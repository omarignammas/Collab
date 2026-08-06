import { FolderKanban, Users, MessageCircle, Mic } from 'lucide-react';
import { CircularProgress } from '../shared/CircularProgress';

// A dock row of generic app placeholders with Collab picked out — sells "this
// actually lives on your machine" without drawing any other app's real icon.
const DOCK_SLOTS = 6;

export const DesktopShowcase = () => (
  <div className="mx-auto max-w-sm">
    {/* Menu bar strip, tray icon + live countdown text — matches the real
        macOS tray behavior exactly (icon label grows a live MM:SS). */}
    <div className="flex items-center justify-end gap-3 rounded-t-lg border border-b-0 border-border/80 bg-card/80 px-4 py-2">
      <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
      <span className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5">
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[4px] bg-primary text-primary-foreground">
          <FolderKanban className="h-2 w-2" />
        </span>
        <span className="font-numeric text-[11px] font-semibold text-primary">24:01</span>
      </span>
    </div>

    {/* Popover widget — pops down from the tray on load, same shape as the real one. */}
    <div className="flex justify-end border-x border-border/80 bg-background/40 px-3 pb-6 pt-3">
      <div className="animate-in fade-in slide-in-from-top-4 flex w-56 flex-col gap-2.5 rounded-[22px] border border-border/60 bg-card/90 p-3.5 shadow-xl shadow-black/10 duration-700 [animation-delay:200ms] [animation-fill-mode:backwards]">
        <div className="flex items-center justify-between">
          <div className="relative flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-[5px] bg-primary text-primary-foreground">
              <FolderKanban className="h-2.5 w-2.5" />
            </span>
            <span className="text-[10px] font-semibold tracking-tight text-foreground">Collab</span>
            <span className="absolute -right-1.5 -top-1 h-1.5 w-1.5 rounded-full bg-destructive ring-2 ring-card" />
          </div>
          <span className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[hsl(var(--chart-4))]" />
            Live
          </span>
        </div>

        <p className="text-center text-[10px] font-medium text-foreground/90">Focus · Round 2/4</p>

        <div className="flex items-center justify-center py-1">
          <CircularProgress percentage={68} size={76} strokeWidth={6} color="orange">
            <div className="flex flex-col items-center">
              <p className="font-numeric text-base font-bold tabular-nums text-foreground">24:01</p>
              <p className="text-[8px] text-muted-foreground">remaining</p>
            </div>
          </CircularProgress>
        </div>

        <div className="flex items-center justify-center gap-1 text-[9px] text-muted-foreground">
          <Users className="h-2.5 w-2.5" />
          <span className="font-numeric">7F2K9X</span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex flex-1 items-start gap-1.5 rounded-xl bg-muted/60 px-2.5 py-2 text-left">
            <MessageCircle className="mt-0.5 h-2.5 w-2.5 shrink-0 text-muted-foreground" />
            <p className="line-clamp-1 text-[9px] leading-snug text-foreground/80">"collab, recap the last 10 min"</p>
          </div>
          <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/60 bg-secondary text-foreground">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/20 [animation-duration:2s]" />
            <Mic className="relative h-2.5 w-2.5" />
          </span>
        </div>
      </div>
    </div>

    {/* Dock strip — Collab's own icon picked out among generic placeholders. */}
    <div className="flex items-end justify-center gap-2 rounded-b-lg border border-t-0 border-border/80 bg-card/60 px-4 py-3">
      {Array.from({ length: DOCK_SLOTS }).map((_, i) => (
        <span key={i} className="h-6 w-6 rounded-[7px] bg-muted-foreground/15" />
      ))}
      <span className="-mt-1.5 flex h-8 w-8 items-center justify-center rounded-[9px] bg-primary text-primary-foreground shadow-lg shadow-primary/30">
        <FolderKanban className="h-4 w-4" />
      </span>
      {Array.from({ length: DOCK_SLOTS }).map((_, i) => (
        <span key={`r-${i}`} className="h-6 w-6 rounded-[7px] bg-muted-foreground/15" />
      ))}
    </div>
  </div>
);

export default DesktopShowcase;
