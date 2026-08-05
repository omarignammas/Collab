import { Card, CardContent } from '../ui/card';
import { Check, X } from 'lucide-react';

// review is null while taking the quiz (no correct answers known yet); once
// set (post-submit), options render as correct/incorrect instead of selectable.
export const QuizQuestionCard = ({ question, index, total, selectedIndex, onSelect, review }) => {
  return (
    <Card className="border-border/80 bg-card">
      <CardContent className="p-5">
        <p className="mb-4 text-sm font-medium text-foreground">
          <span className="mr-2 font-numeric text-muted-foreground">{index + 1}/{total}</span>
          {question.questionText}
        </p>
        <div className="space-y-2">
          {question.options.map((option, i) => {
            const isSelected = selectedIndex === i;
            const isCorrectAnswer = review && i === review.correctIndex;
            const isWrongChosen = review && isSelected && !review.isCorrect;

            return (
              <button
                key={i}
                type="button"
                disabled={!!review}
                onClick={() => onSelect(i)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${
                  isCorrectAnswer
                    ? 'border-[hsl(var(--status-done-fg))] bg-[hsl(var(--status-done-fg)/0.1)] text-foreground'
                    : isWrongChosen
                      ? 'border-destructive bg-destructive/10 text-foreground'
                      : isSelected
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border/80 text-muted-foreground hover:border-primary/40 hover:bg-accent/50 disabled:hover:border-border/80 disabled:hover:bg-transparent'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                    isCorrectAnswer
                      ? 'border-[hsl(var(--status-done-fg))] bg-[hsl(var(--status-done-fg))] text-white'
                      : isWrongChosen
                        ? 'border-destructive bg-destructive text-destructive-foreground'
                        : isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border text-muted-foreground'
                  }`}
                >
                  {isCorrectAnswer ? <Check className="h-3 w-3" /> : isWrongChosen ? <X className="h-3 w-3" /> : String.fromCharCode(65 + i)}
                </span>
                {option}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuizQuestionCard;
