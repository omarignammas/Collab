import { useState } from 'react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Clock3, ExternalLink, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
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
import noteService from '../../services/noteService';
import { useToast } from '../../hooks/use-toast';
import markdownComponents from '../shared/markdownComponents';

const ACCENTS = [
  'hover:border-[hsl(var(--chart-1))]/55',
  'hover:border-[hsl(var(--chart-2))]/55',
  'hover:border-[hsl(var(--chart-3))]/55',
  'hover:border-primary/55',
];

const accentFor = (value = '') => ACCENTS[[...value].reduce((sum, char) => sum + char.charCodeAt(0), 0) % ACCENTS.length];

const NoteMarkdown = ({ children }) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{children}</ReactMarkdown>
);

export const NoteCard = ({ note, onDelete }) => {
  const [deleting, setDeleting] = useState(false);
  const [isReadOpen, setIsReadOpen] = useState(false);
  const { toast } = useToast();
  const pending = note.enrichmentStatus === 'PENDING';
  const body = note.body || note.rawBody || '';
  const preview = body.length > 700 ? `${body.slice(0, 700)}…` : body;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await noteService.deleteNote(note.id);
      toast({ title: 'Note deleted', variant: 'default' });
      onDelete(note.id);
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({ title: 'Error', description: 'Failed to delete note', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className={`group cursor-pointer overflow-hidden border-border/80 bg-card transition-all hover:-translate-y-0.5 hover:shadow-ios ${accentFor(note.theme || note.title)}`} onClick={() => setIsReadOpen(true)}>
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <span className="font-numeric">{note.createdAt ? format(new Date(note.createdAt), 'MMM d · h:mm a') : 'Just now'}</span>
          <div className="flex items-center gap-1.5">
            {pending && <span className="inline-flex items-center gap-1 text-primary"><Loader2 className="h-3 w-3 animate-spin" />organizing</span>}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" onClick={(event) => event.stopPropagation()} className="h-7 w-7 text-muted-foreground opacity-60 hover:text-destructive group-hover:opacity-100" title="Delete note">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(event) => event.stopPropagation()}>
                <AlertDialogHeader><AlertDialogTitle>Delete this note?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">{deleting ? 'Deleting...' : 'Delete'}</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {note.theme && <Badge variant="outline" className="border-primary/25 bg-primary/[0.08] text-[10px] text-primary">{note.theme}</Badge>}
          {note.courseTitle && <span className="truncate text-[10px] text-muted-foreground">{note.courseTitle}</span>}
        </div>
        <CardTitle className="text-base leading-snug text-foreground">{note.title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 pb-5">
        <div className="max-h-64 overflow-hidden text-sm [mask-image:linear-gradient(to_bottom,black_85%,transparent)]">
          {preview ? <NoteMarkdown>{preview}</NoteMarkdown> : <p className="italic text-muted-foreground">Empty note</p>}
        </div>

        {(note.tags?.length > 0 || note.timeReferences?.length > 0 || note.extractedLinks?.length > 0) && (
          <div className="flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
            {(note.tags || []).slice(0, 4).map((tag) => <span key={tag} className="rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground">#{tag}</span>)}
            {(note.timeReferences || []).slice(0, 2).map((time) => <span key={time} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground"><Clock3 className="h-2.5 w-2.5" />{time}</span>)}
            {note.extractedLinks?.length > 0 && <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground"><ExternalLink className="h-2.5 w-2.5" />{note.extractedLinks.length} link{note.extractedLinks.length === 1 ? '' : 's'}</span>}
          </div>
        )}
      </CardContent>

      <Dialog open={isReadOpen} onOpenChange={setIsReadOpen}>
        <DialogContent className="sm:max-w-2xl" onClick={(event) => event.stopPropagation()}>
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2 pr-8">{note.theme && <Badge variant="outline" className="border-primary/25 bg-primary/[0.08] text-primary">{note.theme}</Badge>}{note.aiEnriched && <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><Sparkles className="h-3 w-3 text-primary" />organized by Collab</span>}</div>
            <DialogTitle className="pt-2">{note.title}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 space-y-5">
            <NoteMarkdown>{body || 'This note is empty.'}</NoteMarkdown>
            {note.extractedLinks?.length > 0 && <div className="border-t border-border/60 pt-4"><p className="mb-2 text-xs font-semibold text-foreground">Links</p><div className="space-y-1.5">{note.extractedLinks.map((link) => <a key={link} href={link} target="_blank" rel="noreferrer" className="flex items-center gap-2 break-all text-xs text-primary hover:underline"><ExternalLink className="h-3 w-3 shrink-0" />{link}</a>)}</div></div>}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default NoteCard;
