import { useState, useEffect, useRef } from 'react';
import { Loader2, Mic, Sparkles, Square } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import noteService from '../../services/noteService';
import courseService from '../../services/courseService';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';

export const CreateNoteDialog = ({ open, onOpenChange, onNoteCreated }) => {
  const [formData, setFormData] = useState({ title: '', body: '' });
  const [courseId, setCourseId] = useState('none');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const discardVoiceRef = useRef(false);

  useEffect(() => {
    if (open) {
      courseService.getAllCourses({ size: 100 }).then((result) => {
        setCourses(result.content || []);
      });
    }
  }, [open]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({ title: '', body: '' });
    setCourseId('none');
    setError('');
  };

  const { state: voiceState, toggleRecording, stopRecording } = useVoiceRecorder({
    onTranscribed: (text) => {
      if (discardVoiceRef.current) return;
      setFormData((previous) => {
        const body = previous.body.trim() ? `${previous.body.trim()}\n\n${text}` : text;
        const generatedTitle = text.split(/\s+/).slice(0, 7).join(' ').replace(/[.,!?;:]+$/, '');
        return { title: previous.title || generatedTitle || 'Voice note', body };
      });
    },
    onError: (err) => {
      const denied = ['NotAllowedError', 'NotFoundError', 'DevicesNotFoundError'].includes(err?.name);
      setError(denied ? 'Allow microphone access to record a voice note.' : 'Voice transcription failed. Please try again.');
    },
  });

  const handleToggleRecording = () => {
    if (voiceState === 'idle') discardVoiceRef.current = false;
    toggleRecording();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanBody = formData.body.trim();
      const generatedTitle = cleanBody.split(/\s+/).slice(0, 7).join(' ').replace(/[.,!?;:]+$/, '');
      const newNote = await noteService.createNote({
        title: formData.title.trim() || generatedTitle || 'Quick note',
        body: cleanBody,
        tags: [],
        savedUrl: null,
        courseId: courseId !== 'none' ? Number(courseId) : null,
      });
      onNoteCreated(newNote);
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create note');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    discardVoiceRef.current = true;
    stopRecording();
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>New note</DialogTitle>
          <DialogDescription>Write or dictate naturally. Collab will format it and extract themes, topics, links, and time references.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input
                id="title"
                name="title"
                placeholder="What is this about?"
                value={formData.title}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="body">Note</Label>
                <Button
                  type="button"
                  variant={voiceState === 'recording' ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={handleToggleRecording}
                  disabled={voiceState === 'transcribing'}
                  className="h-8"
                >
                  {voiceState === 'transcribing' ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : voiceState === 'recording' ? <Square className="mr-2 h-3 w-3 fill-current" /> : <Mic className="mr-2 h-3.5 w-3.5" />}
                  {voiceState === 'transcribing' ? 'Transcribing' : voiceState === 'recording' ? 'Finish recording' : 'Record voice'}
                </Button>
              </div>
              <Textarea
                id="body"
                name="body"
                placeholder="Write here, or use the microphone to dictate..."
                value={formData.body}
                onChange={handleChange}
                rows={8}
              />
              {voiceState === 'recording' && <p className="text-xs font-medium text-destructive">Listening. Speak naturally, then press Finish recording.</p>}
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-primary/8 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              The note saves immediately. AI organization finishes quietly in the background.
            </div>

            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={String(course.id)}>{course.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || voiceState !== 'idle' || !formData.body.trim()}>
              {loading ? 'Saving...' : 'Save note'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateNoteDialog;
