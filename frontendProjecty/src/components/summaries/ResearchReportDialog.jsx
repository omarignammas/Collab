import { useEffect, useState } from 'react';
import { Loader2, Mic, Search, Square } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import courseService from '../../services/courseService';
import courseSummaryService from '../../services/courseSummaryService';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';

export const ResearchReportDialog = ({ open, onOpenChange, onCreated }) => {
  const [topic, setTopic] = useState('');
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('none');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { state: voiceState, toggleRecording } = useVoiceRecorder({
    onTranscribed: (text) => setTopic((current) => (current ? `${current} ${text}` : text)),
    onError: () => setError('Microphone access or transcription failed. Please try again.'),
  });

  useEffect(() => {
    if (!open) return;
    courseService.getAllCourses({ size: 100 })
      .then((result) => setProjects(result.content || []))
      .catch(() => setProjects([]));
  }, [open]);

  const reset = () => {
    setTopic('');
    setTitle('');
    setProjectId('none');
    setError('');
  };

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen && !loading) reset();
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    try {
      const report = await courseSummaryService.createResearchReport({
        topic: topic.trim(),
        title: title.trim() || null,
        courseId: projectId === 'none' ? null : Number(projectId),
      });
      reset();
      onCreated(report);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not start the research report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Search className="h-4 w-4 text-primary" />Create a research report</DialogTitle>
          <DialogDescription>Describe the decision, market, or benchmark you need. Collab will prepare a structured report in Summaries.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          <div className="space-y-2">
            <Label htmlFor="research-topic">Research brief</Label>
            <div className="relative">
              <Textarea
                id="research-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Benchmark collaborative focus tools for a small remote team. Compare workflow, pricing, privacy, and integrations."
                className="min-h-32 resize-none pr-12"
                maxLength={1200}
                autoFocus
              />
              <button
                type="button"
                onClick={toggleRecording}
                disabled={voiceState === 'transcribing'}
                title={voiceState === 'recording' ? 'Finish voice brief' : 'Describe the research by voice'}
                className={`absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${voiceState === 'recording' ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-border bg-secondary text-foreground hover:bg-secondary/70'}`}
              >
                {voiceState === 'transcribing' ? <Loader2 className="h-4 w-4 animate-spin" /> : voiceState === 'recording' ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="research-title">Title (optional)</Label>
              <Input id="research-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Collaboration tools benchmark" maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label>Project (optional)</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((project) => <SelectItem key={project.id} value={String(project.id)}>{project.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">The report clearly marks facts that may need current verification. It never pretends that model knowledge is live web research.</p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || !topic.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? 'Starting...' : 'Start research'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ResearchReportDialog;
