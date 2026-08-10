import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
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

export const NoteCard = ({ note, onDelete }) => {
  const [deleting, setDeleting] = useState(false);
  const [isReadOpen, setIsReadOpen] = useState(false);
  const { toast } = useToast();

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
    <Card className="cursor-pointer border-border/80 bg-card transition-colors hover:border-primary/35" onClick={() => setIsReadOpen(true)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="min-w-0 flex-1 truncate text-base text-foreground">{note.title}</CardTitle>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" onClick={(event) => event.stopPropagation()} className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(event) => event.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
                  {deleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {note.body
          ? <p className="line-clamp-5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{note.body}</p>
          : <p className="text-sm italic text-muted-foreground">Empty note</p>}
      </CardContent>

      {note.courseTitle && (
        <CardFooter className="border-t border-border/60 pt-3">
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            {note.courseTitle}
          </Badge>
        </CardFooter>
      )}

      <Dialog open={isReadOpen} onOpenChange={setIsReadOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl" onClick={(event) => event.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{note.title}</DialogTitle>
          </DialogHeader>
          <p className="whitespace-pre-line text-sm leading-7 text-foreground">{note.body || 'This note is empty.'}</p>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default NoteCard;
