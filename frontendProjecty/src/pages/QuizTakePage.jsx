import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, HelpCircle, RotateCcw, Sparkles, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { CircularProgress } from '../components/shared/CircularProgress';
import PageHero from '../components/shared/PageHero';
import QuizQuestionCard from '../components/quizzes/QuizQuestionCard';
import quizService from '../services/quizService';
import { useToast } from '../hooks/use-toast';

const DIFFICULTY_LABEL = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };

export const QuizTakePage = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId;

    const poll = async () => {
      try {
        const data = await quizService.getQuizById(quizId);
        if (cancelled) return;
        setQuiz(data);
        setLoading(false);
        if (data.status === 'PENDING') {
          timeoutId = setTimeout(poll, 3000);
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
  }, [quizId]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await quizService.cancel(quizId);
      setQuiz((prev) => ({ ...prev, status: 'CANCELLED' }));
      toast({ title: 'Cancelled', description: 'Quiz generation was cancelled.' });
    } catch (err) {
      toast({ title: 'Could not cancel', description: err.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  const handleSelect = (questionIndex, optionIndex) => {
    if (result) return;
    setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const allAnswered = quiz && quiz.questions.every((_, i) => answers[i] !== undefined);

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const orderedAnswers = quiz.questions.map((_, i) => answers[i]);
      const response = await quizService.submitAttempt(quizId, orderedAnswers);
      setResult(response);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setResult(null);
    setAnswers({});
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">Loading quiz...</div>;
  }

  if (!quiz) {
    return <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">Quiz not found</div>;
  }

  return (
    <div className="accent-purple container mx-auto max-w-5xl px-4 py-10 pb-28">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <PageHero
        icon={HelpCircle}
        title={quiz.title}
        subtitle={
          <>
            Based on{' '}
            <Link to={`/summaries/${quiz.summaryId}`} className="text-primary hover:underline">
              {quiz.summaryTitle}
            </Link>
          </>
        }
      />

      <div className="mb-6 flex items-center gap-2">
        <Badge variant="outline" className="border-border text-muted-foreground">
          {DIFFICULTY_LABEL[quiz.difficulty]} difficulty
        </Badge>
        {quiz.status === 'READY' && (
          <Badge variant="outline" className="border-border text-muted-foreground">
            {quiz.questions.length} questions
          </Badge>
        )}
      </div>

      {quiz.status === 'PENDING' && (
        <Card className="border-border/80 bg-card">
          <CardContent className="flex items-center justify-between gap-3 p-6">
            <p className="flex items-center gap-3 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 animate-pulse text-primary" />
              Generating your quiz…
            </p>
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={cancelling}>
              <X className="mr-2 h-3.5 w-3.5" />
              {cancelling ? 'Cancelling...' : 'Cancel'}
            </Button>
          </CardContent>
        </Card>
      )}

      {quiz.status === 'FAILED' && (
        <Card className="border-border/80 bg-card">
          <CardContent className="p-6 text-sm text-muted-foreground">Couldn't generate this quiz.</CardContent>
        </Card>
      )}

      {quiz.status === 'CANCELLED' && (
        <Card className="border-border/80 bg-card">
          <CardContent className="p-6 text-sm text-muted-foreground">Quiz generation was cancelled.</CardContent>
        </Card>
      )}

      {quiz.status === 'READY' && result && (
        <Card className="mb-6 border-border/80 bg-card">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:text-left">
            <CircularProgress
              percentage={result.percentage}
              size={90}
              strokeWidth={7}
              color={result.percentage >= 70 ? 'green' : result.percentage >= 40 ? 'orange' : 'blue'}
            >
              <span className="font-numeric text-lg font-bold text-foreground">{Math.round(result.percentage)}%</span>
            </CircularProgress>
            <div className="flex-1">
              <p className="text-lg font-semibold text-foreground">
                {result.score} / {result.totalQuestions} correct
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Review your answers below, or take it again.</p>
            </div>
            <Button variant="outline" onClick={handleRetake}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Retake
            </Button>
          </CardContent>
        </Card>
      )}

      {quiz.status === 'READY' && error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {quiz.status === 'READY' && (
        <div className="space-y-4">
          {quiz.questions.map((question, i) => (
            <QuizQuestionCard
              key={question.id}
              question={question}
              index={i}
              total={quiz.questions.length}
              selectedIndex={answers[i]}
              onSelect={(optionIndex) => handleSelect(i, optionIndex)}
              review={result ? result.results[i] : null}
            />
          ))}
        </div>
      )}

      {quiz.status === 'READY' && !result && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border/80 bg-background/95 p-4 backdrop-blur-md">
          <div className="container mx-auto flex max-w-5xl justify-end px-4">
            <Button onClick={handleSubmit} disabled={!allAnswered || submitting}>
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizTakePage;
