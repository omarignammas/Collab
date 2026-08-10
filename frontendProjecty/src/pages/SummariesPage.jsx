import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Plus, FileText, HelpCircle, Users, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import PageHero from '../components/shared/PageHero';
import UploadSummaryDialog from '../components/summaries/UploadSummaryDialog';
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
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summariesResult, quizzesResult] = await Promise.all([
        courseSummaryService.getAllSummaries({ size: 100 }),
        quizService.getAllQuizzes({ size: 100 }),
      ]);
      setSummaries(summariesResult.content || []);
      setQuizzes(quizzesResult.content || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
        action={
          <Button onClick={() => setIsUploadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Upload File
          </Button>
        }
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
      ) : activeTab === 'summaries' ? (
        summaries.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No summaries yet — upload a file to get started.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summaries.map((summary) => (
              <Card
                key={summary.id}
                onClick={() => navigate(`/summaries/${summary.id}`)}
                className="cursor-pointer border-border/80 bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40"
              >
                <CardContent className="p-5">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {!summary.isOwner && (
                        <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/10 text-primary">
                          <Users className="h-3 w-3" />
                          shared
                        </Badge>
                      )}
                      <StatusBadge status={summary.status} />
                    </div>
                  </div>
                  <p className="truncate text-sm font-medium text-foreground">{summary.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {summary.courseTitle || (summary.isOwner ? 'No project' : `by ${summary.ownerName}`)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : quizzes.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No quizzes yet — generate one from a summary.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <Card
              key={quiz.id}
              onClick={() => navigate(quiz.status === 'READY' ? `/quizzes/${quiz.id}/take` : `/summaries/${quiz.summaryId}`)}
              className="cursor-pointer border-border/80 bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40"
            >
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
          ))}
        </div>
      )}

      <UploadSummaryDialog open={isUploadOpen} onOpenChange={setIsUploadOpen} onUploaded={handleUploaded} />
    </div>
  );
};

export default SummariesPage;
