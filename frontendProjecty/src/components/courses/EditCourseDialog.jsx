import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import courseService from '../../services/courseService';
import termService from '../../services/termService';

const COLOR_SWATCHES = [
  { label: 'Amber', value: '#E8B84B' },
  { label: 'Blue', value: '#4B9FE8' },
  { label: 'Purple', value: '#9B6BE8' },
  { label: 'Coral', value: '#E85B4B' },
  { label: 'Teal', value: '#4BE8A0' },
];

export const EditCourseDialog = ({ course, open, onOpenChange, onCourseUpdated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructorName: '',
    instructorEmail: '',
  });
  const [colorTag, setColorTag] = useState('');
  const [termId, setTermId] = useState('');
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title,
        description: course.description || '',
        instructorName: course.instructorName || '',
        instructorEmail: course.instructorEmail || '',
      });
      setColorTag(course.colorTag || '');
      setTermId(course.termId ? String(course.termId) : '');
    }
  }, [course]);

  useEffect(() => {
    if (open) {
      termService.getAllTerms({ size: 100 }).then((result) => {
        setTerms(result.content || []);
      });
    }
  }, [open]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const updatedCourse = await courseService.updateCourse(course.id, {
        ...formData,
        termId: Number(termId),
        colorTag: colorTag || null,
      });
      onCourseUpdated(updatedCourse);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update course');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>
            Update your course details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Course Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Organic Chemistry"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Brief description of your course..."
                value={formData.description}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Term *</Label>
              <Select value={termId} onValueChange={setTermId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((term) => (
                    <SelectItem key={term.id} value={String(term.id)}>
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color tag</Label>
              <div className="flex gap-2">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.value}
                    type="button"
                    title={swatch.label}
                    onClick={() => setColorTag(colorTag === swatch.value ? '' : swatch.value)}
                    className={`h-6 w-6 rounded-full transition-transform ${colorTag === swatch.value ? 'scale-110 ring-2 ring-foreground/50 ring-offset-2 ring-offset-background' : ''}`}
                    style={{ backgroundColor: swatch.value }}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="instructorName">Instructor</Label>
                <Input
                  id="instructorName"
                  name="instructorName"
                  placeholder="Optional"
                  value={formData.instructorName}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instructorEmail">Instructor email</Label>
                <Input
                  id="instructorEmail"
                  name="instructorEmail"
                  type="email"
                  placeholder="Optional"
                  value={formData.instructorEmail}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !termId}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCourseDialog;
