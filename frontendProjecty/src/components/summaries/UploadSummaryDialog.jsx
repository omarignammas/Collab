import { useState, useEffect, useRef } from 'react';
import { Check, ArrowLeft, ArrowRight, Upload, FileText, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import courseSummaryService from '../../services/courseSummaryService';
import courseService from '../../services/courseService';

const ACCEPTED = '.pdf,.png,.jpg,.jpeg,.webp';

const StepDot = ({ n, label, current, done }) => (
  <div className="flex items-center gap-2">
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-300 ${
        done
          ? 'border-primary bg-primary text-primary-foreground'
          : current
            ? 'border-primary text-primary'
            : 'border-border text-muted-foreground'
      }`}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : n}
    </span>
    <span className={`text-xs font-medium transition-colors duration-300 ${current || done ? 'text-foreground' : 'text-muted-foreground'}`}>
      {label}
    </span>
  </div>
);

export const UploadSummaryDialog = ({ open, onOpenChange, onUploaded }) => {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [courseId, setCourseId] = useState('none');
  const [title, setTitle] = useState('');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      courseService.getAllCourses({ size: 100 }).then((result) => {
        setCourses(result.content || []);
      });
    }
  }, [open]);

  const resetForm = () => {
    setStep(1);
    setFile(null);
    setCourseId('none');
    setTitle('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setTitle((prev) => prev || selected.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (step === 1) {
      if (!file) return;
      setStep(2);
      return;
    }

    setError('');
    setLoading(true);
    try {
      const summary = await courseSummaryService.uploadSummary({
        file,
        courseId: courseId !== 'none' ? Number(courseId) : null,
        title,
      });
      onUploaded(summary);
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  const isImage = file && file.type.startsWith('image/');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Upload project material</DialogTitle>
          <DialogDescription>Upload a PDF or image and AI will generate a study summary and diagram.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 pb-1">
          <StepDot n={1} label="Choose file" current={step === 1} done={step > 1} />
          <span className={`h-px flex-1 transition-colors duration-300 ${step > 1 ? 'bg-primary' : 'bg-border'}`} />
          <StepDot n={2} label="Details" current={step === 2} done={false} />
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-left-2 space-y-4 py-4 duration-300">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED}
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border/80 p-8 text-center transition-colors hover:border-primary/50 hover:bg-accent/50"
              >
                {file ? (
                  <>
                    {isImage ? <ImageIcon className="h-8 w-8 text-primary" /> : <FileText className="h-8 w-8 text-primary" />}
                    <div>
                      <p className="text-sm font-medium text-foreground">{file.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB — click to change</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Click to choose a file</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">PDF, PNG, JPEG, or WebP</p>
                    </div>
                  </>
                )}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-2 space-y-4 py-4 duration-300">
              <div className="space-y-2">
                <Label htmlFor="summary-title">Title</Label>
                <Input id="summary-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Chapter 4 Notes" />
              </div>

              <div className="space-y-2">
                <Label>Project (optional)</Label>
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

              <p className="text-xs text-muted-foreground">
                AI will read your file and generate a study summary with key points and a diagram — this takes a few seconds after upload.
              </p>
            </div>
          )}

          <DialogFooter>
            {step === 1 ? (
              <>
                <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                <Button type="submit" disabled={!file}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={loading}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Uploading...' : 'Upload'}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UploadSummaryDialog;
