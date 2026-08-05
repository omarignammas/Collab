import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Circle, Loader2, Youtube } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../../hooks/use-toast';
import youtubeService from '../../services/youtubeService';
import termService from '../../services/termService';

const IMPORT_STEPS = [
  { key: 'fetch', label: 'Reading playlist details' },
  { key: 'tasks', label: 'Creating tasks from videos' },
  { key: 'finish', label: 'Wrapping up' },
];

export const ImportYoutubePlaylistDialog = ({ open, onOpenChange, onCourseCreated }) => {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [termId, setTermId] = useState('');
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const timeoutsRef = useRef([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const result = await termService.getAllTerms({ size: 100 });
        setTerms(result.content || []);
      } catch (err) {
        console.error('Error loading terms:', err);
      }
    })();
  }, [open]);

  useEffect(() => () => timeoutsRef.current.forEach(clearTimeout), []);

  const resetForm = () => {
    setPlaylistUrl('');
    setTermId('');
    setError('');
    setStepIndex(0);
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setStepIndex(0);

    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [
      setTimeout(() => setStepIndex(1), 900),
      setTimeout(() => setStepIndex(2), 2200),
    ];

    try {
      const response = await youtubeService.importPlaylist({
        playlistUrl,
        termId: Number(termId),
      });
      timeoutsRef.current.forEach(clearTimeout);
      setStepIndex(IMPORT_STEPS.length);
      toast({
        title: 'Playlist imported',
        description: `${response.tasksImported} task${response.tasksImported === 1 ? '' : 's'} imported${
          response.tasksSkipped ? `, ${response.tasksSkipped} skipped` : ''
        }`,
      });
      onCourseCreated(response.course);
      resetForm();
    } catch (err) {
      timeoutsRef.current.forEach(clearTimeout);
      setError(err.response?.data?.message || 'Failed to import playlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import YouTube Playlist</DialogTitle>
          <DialogDescription>
            Turn a public YouTube playlist into a course — each video becomes a task
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {loading ? (
              <div className="space-y-2 py-2">
                {IMPORT_STEPS.map((step, i) => {
                  const state = i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'pending';
                  return (
                    <div
                      key={step.key}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-all duration-500 ${
                        state === 'active'
                          ? 'animate-in fade-in slide-in-from-bottom-1 border-primary/40 bg-primary/5'
                          : state === 'done'
                            ? 'animate-in fade-in border-border/60 bg-card'
                            : 'border-border/40 bg-card opacity-40'
                      }`}
                    >
                      {state === 'done' ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                      ) : state === 'active' ? (
                        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" />
                      )}
                      <span className={`text-sm ${state === 'pending' ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="playlistUrl">Playlist URL *</Label>
                  <Input
                    id="playlistUrl"
                    placeholder="https://www.youtube.com/playlist?list=..."
                    value={playlistUrl}
                    onChange={(e) => setPlaylistUrl(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Only public or unlisted playlists can be imported.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Term *</Label>
                  <Select value={termId} onValueChange={setTermId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a term" />
                    </SelectTrigger>
                    <SelectContent>
                      {terms.map((term) => (
                        <SelectItem key={term.id} value={String(term.id)}>
                          {term.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !termId || !playlistUrl}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Youtube className="mr-2 h-4 w-4" />
                  Import Playlist
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ImportYoutubePlaylistDialog;
