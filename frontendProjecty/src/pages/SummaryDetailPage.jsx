import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, FileText, RotateCcw, Share2, Sparkles, HelpCircle, ArrowRight, X, Paperclip, Mic, Square, Loader2, RefreshCw, Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import PageHero from '../components/shared/PageHero';
import ConceptMap from '../components/summaries/ConceptMap';
import ShareDialog from '../components/summaries/ShareDialog';
import markdownComponents from '../components/shared/markdownComponents';
import courseSummaryService from '../services/courseSummaryService';
import quizService from '../services/quizService';
import { useToast } from '../hooks/use-toast';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

const DIFFICULTY_LABEL = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };

export const SummaryDetailPage = () => {
  const { summaryId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false);
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [referenceFiles, setReferenceFiles] = useState([]);
  const [focusPrompt, setFocusPrompt] = useState('');
  const [regeneratingFrom, setRegeneratingFrom] = useState(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const referenceInputRef = useRef(null);

  // Same speak-and-transcribe hook the chat composer and widget use — lets the
  // student describe what to focus on by voice instead of typing it out.
  const { state: voiceState, toggleRecording } = useVoiceRecorder({
    onTranscribed: (trimmed) => setFocusPrompt((prev) => (prev ? `${prev} ${trimmed}` : trimmed)),
    onError: () => toast({ title: 'Could not transcribe', description: 'Please try again.', variant: 'destructive' }),
  });

  const resetQuizDialog = () => {
    setIsQuizDialogOpen(false);
    setReferenceFiles([]);
    setFocusPrompt('');
    setRegeneratingFrom(null);
    if (referenceInputRef.current) referenceInputRef.current.value = '';
  };

  const openNewVersionDialog = (quiz) => {
    setDifficulty(quiz.difficulty);
    setFocusPrompt(quiz.focusPrompt || '');
    setReferenceFiles([]);
    setRegeneratingFrom(quiz);
    setIsQuizDialogOpen(true);
  };

  const fetchQuizzes = async (id) => {
    const result = await quizService.getQuizzesForSummary(id);
    setQuizzes(result);
  };

  useEffect(() => {
    let cancelled = false;
    let timeoutId;

    const poll = async () => {
      try {
        const data = await courseSummaryService.getSummaryById(summaryId);
        if (cancelled) return;
        setSummary(data);
        setLoading(false);
        if (data.status === 'PENDING') {
          timeoutId = setTimeout(poll, 3000);
        } else {
          fetchQuizzes(summaryId);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [summaryId]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await courseSummaryService.retry(summaryId);
      setSummary((prev) => ({ ...prev, status: 'PENDING' }));
      toast({ title: 'Retrying', description: 'Regenerating your summary…' });
      const data = await courseSummaryService.getSummaryById(summaryId);
      setSummary(data);
    } catch (error) {
      toast({ title: 'Could not retry', description: error.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setRetrying(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await courseSummaryService.cancel(summaryId);
      setSummary((prev) => ({ ...prev, status: 'CANCELLED' }));
      toast({ title: 'Cancelled', description: 'Summary generation was cancelled.' });
    } catch (error) {
      toast({ title: 'Could not cancel', description: error.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  const handleGenerateQuiz = async () => {
    setGeneratingQuiz(true);
    try {
      const quiz = await quizService.requestQuizGeneration(summaryId, difficulty, referenceFiles, focusPrompt.trim());
      resetQuizDialog();
      toast({ title: 'Quiz generating', description: 'It\'ll be ready in a few seconds.' });
      fetchQuizzes(summaryId);
      navigate(`/quizzes/${quiz.id}/take`);
    } catch (error) {
      toast({ title: 'Could not generate quiz', description: error.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleShare = async (userIds) => {
    for (const userId of userIds) {
      await courseSummaryService.shareSummary(summaryId, userId);
    }
    toast({ title: 'Shared', description: `Shared with ${userIds.length} friend${userIds.length === 1 ? '' : 's'}.` });
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">Loading summary...</div>;
  }

  if (!summary) {
    return <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">Summary not found</div>;
  }

  return (
    <div className="accent-blue container mx-auto max-w-5xl px-4 py-10">
      <Button variant="ghost" onClick={() => navigate('/summaries')} className="mb-6 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Summaries
      </Button>

      <div className="mb-6 flex items-start justify-between gap-4">
        <PageHero
          icon={summary.researchReport ? Search : FileText}
          title={summary.title}
          subtitle={summary.courseTitle ? `${summary.researchReport ? 'Research for' : 'From'} ${summary.courseTitle}` : (!summary.isOwner ? `Shared by ${summary.ownerName}` : summary.researchReport ? 'Collab research report' : undefined)}
        />
        {summary.isOwner && (
          <Button variant="outline" size="icon" onClick={() => setIsShareOpen(true)} title="Share">
            <Share2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {summary.status === 'PENDING' && (
        <Card className="border-border/80 bg-card">
          <CardContent className="flex items-center justify-between gap-3 p-6">
            <p className="flex items-center gap-3 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 animate-pulse text-primary" />
              {summary.researchReport ? 'Researching, comparing, and preparing your report…' : 'Generating your summary and diagram…'}
            </p>
            {summary.isOwner && (
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={cancelling}>
                <X className="mr-2 h-3.5 w-3.5" />
                {cancelling ? 'Cancelling...' : 'Cancel'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {summary.status === 'FAILED' && (
        <Card className="border-border/80 bg-card">
          <CardContent className="flex items-center justify-between gap-3 p-6">
            <p className="text-sm text-muted-foreground">{summary.researchReport ? 'Could not complete this research report.' : "Couldn't generate a summary for this file."}</p>
            {summary.isOwner && (
              <Button variant="outline" size="sm" onClick={handleRetry} disabled={retrying}>
                <RotateCcw className={`mr-2 h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} />
                {retrying ? 'Retrying...' : 'Retry'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {summary.status === 'CANCELLED' && (
        <Card className="border-border/80 bg-card">
          <CardContent className="flex items-center justify-between gap-3 p-6">
            <p className="text-sm text-muted-foreground">Summary generation was cancelled.</p>
            {summary.isOwner && (
              <Button variant="outline" size="sm" onClick={handleRetry} disabled={retrying}>
                <RotateCcw className={`mr-2 h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} />
                {retrying ? 'Retrying...' : 'Retry'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {summary.status === 'READY' && (
        <div className="space-y-6">
          {!summary.researchReport && summary.diagramJson && <ConceptMap json={summary.diagramJson} />}

          <Card className="border-border/80 bg-card">
            <CardContent className="p-6">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {summary.summaryMarkdown}
              </ReactMarkdown>
            </CardContent>
          </Card>

          {!summary.researchReport && <div className="flex items-center justify-between">
            <p className="section-header">
              <HelpCircle className="h-4 w-4 text-primary" />
              quizzes
            </p>
            <Button size="sm" onClick={() => setIsQuizDialogOpen(true)}>
              Generate Quiz
            </Button>
          </div>}

          {!summary.researchReport && (quizzes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quizzes yet — generate one to test yourself on this material.</p>
          ) : (
            <div className="space-y-2">
              {quizzes.map((quiz) => (
                <Card key={quiz.id} className="border-border/80 bg-card transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center justify-between p-4">
                    <Link to={`/quizzes/${quiz.id}/take`} className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{quiz.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-border text-xs text-muted-foreground">
                          {DIFFICULTY_LABEL[quiz.difficulty]}
                        </Badge>
                        {quiz.status === 'PENDING' && (
                          <span className="text-xs text-muted-foreground">generating…</span>
                        )}
                        {quiz.status === 'FAILED' && (
                          <span className="text-xs text-destructive">failed</span>
                        )}
                        {quiz.status === 'CANCELLED' && (
                          <span className="text-xs text-muted-foreground">cancelled</span>
                        )}
                        {quiz.focusPrompt && (
                          <span className="truncate text-xs text-muted-foreground">
                            Focus: {quiz.focusPrompt}
                          </span>
                        )}
                      </div>
                    </Link>
                    <div className="flex shrink-0 items-center gap-1">
                      {quiz.status !== 'PENDING' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Generate another version"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openNewVersionDialog(quiz);
                          }}
                        >
                          <RefreshCw className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                      <Link to={`/quizzes/${quiz.id}/take`}>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      )}

      <Dialog open={isQuizDialogOpen} onOpenChange={(open) => (open ? setIsQuizDialogOpen(true) : resetQuizDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{regeneratingFrom ? `New version of "${regeneratingFrom.title}"` : 'Generate a quiz'}</DialogTitle>
            <DialogDescription>
              {regeneratingFrom
                ? 'Same material, a fresh set of questions — tweak the difficulty or focus, or just generate another suggestion as-is.'
                : 'Choose a difficulty level for the questions.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EASY">Easy</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HARD">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Focus on (optional)</Label>
              <div className="relative">
                <Textarea
                  value={focusPrompt}
                  onChange={(e) => setFocusPrompt(e.target.value)}
                  placeholder="e.g. mostly recursion and Big-O, skip the intro definitions"
                  className="min-h-20 resize-none pr-11"
                />
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={voiceState === 'transcribing'}
                  title={voiceState === 'recording' ? 'Stop and transcribe' : 'Describe it by voice'}
                  className={`absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                    voiceState === 'recording'
                      ? 'border-destructive/40 bg-destructive/10 text-destructive'
                      : 'border-border/60 bg-secondary text-foreground hover:bg-secondary/70'
                  }`}
                >
                  {voiceState === 'transcribing' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : voiceState === 'recording' ? (
                    <Square className="h-3 w-3 fill-current" />
                  ) : (
                    <Mic className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Tell the AI what to weight the questions toward — type it or tap the mic.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Extra resources (optional)</Label>
              <input
                ref={referenceInputRef}
                type="file"
                multiple
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  setReferenceFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
                  e.target.value = '';
                }}
              />
              {referenceFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-md border border-border/80 bg-background px-3 py-2 text-sm">
                  <span className="truncate text-foreground">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setReferenceFiles((prev) => prev.filter((_, i) => i !== index))}
                    className="ml-2 shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-muted-foreground"
                onClick={() => referenceInputRef.current?.click()}
              >
                <Paperclip className="mr-2 h-4 w-4" />
                {referenceFiles.length ? 'Add another file' : 'Upload past quizzes or extra material'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Optional — past quizzes or extra study material the AI can draw on and match style from. Never copied verbatim.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetQuizDialog}>
              Cancel
            </Button>
            <Button onClick={handleGenerateQuiz} disabled={generatingQuiz}>
              {generatingQuiz ? 'Generating...' : regeneratingFrom ? 'Generate new version' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShareDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        title="Share this summary"
        onShare={handleShare}
      />
    </div>
  );
};

export default SummaryDetailPage;
