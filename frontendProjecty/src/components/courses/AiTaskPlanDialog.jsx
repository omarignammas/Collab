import { useState, useRef, useEffect } from 'react';
import { Sparkles, Upload, X, Trash2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import taskPlanService from '../../services/taskPlanService';
import { useToast } from '../../hooks/use-toast';

const TASK_TYPES = [
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'ASSIGNMENT', label: 'Assignment' },
  { value: 'EXAM', label: 'Exam' },
  { value: 'READING', label: 'Reading' },
  { value: 'LAB_REPORT', label: 'Lab Report' },
];

const TASK_PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

export const AiTaskPlanDialog = ({ courseId, open, onOpenChange, onPlanApplied }) => {
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [targetDate, setTargetDate] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [generating, setGenerating] = useState(false);
  const [planId, setPlanId] = useState(null);
  const [planStatus, setPlanStatus] = useState(null);
  const [rows, setRows] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const reset = () => {
    setStep('upload');
    setFile(null);
    setTargetDate('');
    setAdditionalContext('');
    setPlanId(null);
    setPlanStatus(null);
    setRows([]);
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  // Poll while the plan is generating — mirrors the poll pattern used for
  // summaries/quizzes elsewhere in the app.
  useEffect(() => {
    if (step !== 'generating' || !planId) return undefined;
    let cancelled = false;
    let timeoutId;

    const poll = async () => {
      try {
        const data = await taskPlanService.getPlan(courseId, planId);
        if (cancelled) return;
        setPlanStatus(data.status);
        if (data.status === 'PENDING') {
          timeoutId = setTimeout(poll, 3000);
        } else if (data.status === 'READY') {
          setRows(data.proposedTasks.map((t) => ({ ...t, include: true })));
          setStep('review');
        }
      } catch {
        if (!cancelled) setPlanStatus('FAILED');
      }
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [step, planId, courseId]);

  const handleGenerate = async () => {
    if (!file && !additionalContext.trim()) {
      toast({ title: 'Add something to plan from', description: 'Upload a reference file or describe the project.', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const plan = await taskPlanService.requestPlan(courseId, {
        file,
        targetDate: targetDate || undefined,
        additionalContext: additionalContext.trim() || undefined,
      });
      setPlanId(plan.id);
      setPlanStatus(plan.status);
      setStep('generating');
    } catch (error) {
      toast({ title: 'Could not start generation', description: error.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleCancelGeneration = async () => {
    setCancelling(true);
    try {
      await taskPlanService.cancelPlan(courseId, planId);
      toast({ title: 'Cancelled', description: 'Task plan generation was cancelled.' });
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Could not cancel', description: error.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  const updateRow = (index, patch) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    const selected = rows.filter((r) => r.include);
    if (selected.length === 0) return;
    setConfirming(true);
    try {
      const tasks = selected.map(({ title, description, dueDate, priority, type }) => ({
        title, description, dueDate: dueDate || null, priority, type,
      }));
      await taskPlanService.confirmPlan(courseId, planId, tasks);
      toast({ title: 'Tasks created', description: `${selected.length} task${selected.length === 1 ? '' : 's'} added to this course.` });
      onOpenChange(false);
      onPlanApplied?.();
    } catch (error) {
      toast({ title: 'Could not create tasks', description: error.response?.data?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setConfirming(false);
    }
  };

  const selectedCount = rows.filter((r) => r.include).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={step === 'review' ? 'max-w-2xl' : undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Task Plan
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a reference file and/or describe the project — AI proposes a task breakdown you can review before anything is created.'}
            {step === 'generating' && 'Reading your material and drafting a plan…'}
            {step === 'review' && 'Review the proposed tasks — edit, uncheck, or remove anything before creating them.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Reference file (optional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <div className="flex items-center justify-between rounded-md border border-border/80 bg-background px-3 py-2 text-sm">
                  <span className="truncate text-foreground">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="ml-2 shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Button type="button" variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload a brief, syllabus, or assignment sheet
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label>Target completion date (optional)</Label>
              <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Additional context (optional)</Label>
              <Textarea
                placeholder="e.g., This is a 4-person capstone project, we already have the dataset..."
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {step === 'generating' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {planStatus === 'FAILED' ? "Couldn't generate a plan — try again with more context." : 'This usually takes a few seconds…'}
            </p>
          </div>
        )}

        {step === 'review' && (
          <div className="max-h-[50vh] space-y-3 overflow-y-auto py-2">
            {rows.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">No tasks left — add one manually instead.</p>
            ) : (
              rows.map((row, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-border/80 bg-card p-3">
                  <Checkbox
                    checked={row.include}
                    onCheckedChange={(checked) => updateRow(i, { include: Boolean(checked) })}
                    className="mt-2"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Input value={row.title} onChange={(e) => updateRow(i, { title: e.target.value })} className="font-medium" />
                    <div className="grid grid-cols-3 gap-2">
                      <Input type="date" value={row.dueDate || ''} onChange={(e) => updateRow(i, { dueDate: e.target.value })} className="text-xs" />
                      <Select value={row.priority} onValueChange={(v) => updateRow(i, { priority: v })}>
                        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TASK_PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={row.type} onValueChange={(v) => updateRow(i, { type: v })}>
                        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TASK_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeRow(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? 'Starting...' : 'Generate Plan'}
              </Button>
            </>
          )}
          {step === 'generating' && (
            <Button type="button" variant="outline" onClick={handleCancelGeneration} disabled={cancelling}>
              {cancelling ? 'Cancelling...' : 'Cancel'}
            </Button>
          )}
          {step === 'review' && (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Discard</Button>
              <Button onClick={handleConfirm} disabled={confirming || selectedCount === 0}>
                {confirming ? 'Creating...' : `Create ${selectedCount} Task${selectedCount === 1 ? '' : 's'}`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AiTaskPlanDialog;
