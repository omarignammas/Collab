import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Plus, FileText, HelpCircle, Users, Loader2, Search } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import PageHero from '../components/shared/PageHero';
import UploadSummaryDialog from '../components/summaries/UploadSummaryDialog';
import ResearchReportDialog from '../components/summaries/ResearchReportDialog';
import courseSummaryService from '../services/courseSummaryService';
import quizService from '../services/quizService';

const DIFFICULTY_LABEL = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };

const StatusBadge = ({ status }) => {
  if (status === 'PENDING') {
    return (
      <Badge variant="outline" className="gap-1 border-border text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        generating
      </Badge>
    );
  }
  if (status === 'FAILED') {
    return <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">failed</Badge>;
  }
  return null;
};

export const SummariesPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('summaries');
  const [summaries, setSummaries] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadVersion, setReloadVersion] = useState(0);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isResearchOpen, setIsResearchOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchActiveCollection = async () => {
      setLoading(true);
      setLoadError('');
      try {
        if (activeTab === 'summaries') {
          const result = await courseSummaryService.getAllSummaries({ size: 100 });
          if (!cancelled) setSummaries(result.content || []);
        } else {
          const result = await quizService.getAllQuizzes({ size: 100 });
          if (!cancelled) setQuizzes(result.content || []);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error.response?.data?.message || `Could not load your ${activeTab}.`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchActiveCollection();
    return () => { cancelled = true; };
  }, [activeTab, reloadVersion]);

  const handleUploaded = (summary) => {
    setIsUploadOpen(false);
    navigate(`/summaries/${summary.id}`);
  };

  return (
    <div className="accent-blue w-full px-4 py-10">
      <PageHero
        icon={Sparkles}
        title="Summaries"
        subtitle="Turn project material into clear summaries and useful follow-up work."
        action={<div className="flex w-full flex-col gap-2 min-[420px]:flex-row sm:w-auto"><Button variant="outline" onClick={() => setIsUploadOpen(true)}><Plus className="h-4 w-4" />Upload file</Button><Button onClick={() => setIsResearchOpen(true)}><Search className="h-4 w-4" />Research</Button></div>}
      />

      <div className="mb-6 inline-flex gap-1 rounded-lg border border-border/80 bg-card p-1">
        <button
          type="button"
          onClick={() => setActiveTab('summaries')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === 'summaries' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          My Summaries
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('quizzes')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === 'quizzes' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          My Quizzes
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-border/80 bg-card" />
          ))}
        </div>
      ) : loadError ? (
        <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">Could not load {activeTab}</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">{loadError}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setReloadVersion((value) => value + 1)}>
            Try again
          </Button>
        </div>
      ) : activeTab === 'summaries' ? (
        summaries.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No summaries yet. Upload material or ask Collab to research a topic.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summaries.map((summary) => (
              <Link key={summary.id} to={`/summaries/${summary.id}`} className="block min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Card className="h-full cursor-pointer border-border/80 bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40">
                  <CardContent className="p-5">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {summary.researchReport ? <Search className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                      </span>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {!summary.isOwner && (
                          <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-primary">
                            <Users className="h-3 w-3" />
                            shared
                          </Badge>
                        )}
                        {summary.researchReport && <Badge variant="outline" className="border-primary/25 bg-primary/10 text-primary">research</Badge>}
                        <StatusBadge status={summary.status} />
                      </div>
                    </div>
                    <p className="truncate text-sm font-medium text-foreground">{summary.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {summary.courseTitle || (summary.isOwner ? 'No project' : `by ${summary.ownerName}`)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )
      ) : quizzes.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No quizzes yet — generate one from a summary.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <Link key={quiz.id} to={quiz.status === 'READY' ? `/quizzes/${quiz.id}/take` : `/summaries/${quiz.summaryId}`} className="block min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="h-full cursor-pointer border-border/80 bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40">
                <CardContent className="p-5">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <HelpCircle className="h-4 w-4" />
                    </span>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {!quiz.isOwner && (
                        <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-primary">
                          <Users className="h-3 w-3" />
                          shared
                        </Badge>
                      )}
                      <StatusBadge status={quiz.status} />
                    </div>
                  </div>
                  <p className="truncate text-sm font-medium text-foreground">{quiz.title}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Badge variant="outline" className="border-border text-xs text-muted-foreground">
                      {DIFFICULTY_LABEL[quiz.difficulty]}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <UploadSummaryDialog open={isUploadOpen} onOpenChange={setIsUploadOpen} onUploaded={handleUploaded} />
      <ResearchReportDialog open={isResearchOpen} onOpenChange={setIsResearchOpen} onCreated={(summary) => { setIsResearchOpen(false); navigate(`/summaries/${summary.id}`); }} />
    </div>
  );
};

export default SummariesPage;
