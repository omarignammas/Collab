import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import noteService from '../../services/noteService';
import courseService from '../../services/courseService';

export const CreateNoteDialog = ({ open, onOpenChange, onNoteCreated }) => {
  const [formData, setFormData] = useState({ title: '', body: '', tags: '', savedUrl: '' });
  const [courseId, setCourseId] = useState('none');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    setFormData({ title: '', body: '', tags: '', savedUrl: '' });
    setCourseId('none');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const newNote = await noteService.createNote({
        title: formData.title,
        body: formData.body,
        tags: formData.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        savedUrl: formData.savedUrl || null,
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
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Note</DialogTitle>
          <DialogDescription>Jot something down, optionally tied to a course</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Chapter 4 summary"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Body</Label>
              <Textarea
                id="body"
                name="body"
                placeholder="Write your note..."
                value={formData.body}
                onChange={handleChange}
                rows={4}
              />
              {formData.savedUrl && !formData.body && (
                <p className="text-xs text-muted-foreground">
                  Left blank — we'll pull the article text from your saved link automatically.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Course</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="No course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No course</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={String(course.id)}>{course.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                name="tags"
                placeholder="comma, separated, tags"
                value={formData.tags}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="savedUrl">Saved link (optional)</Label>
              <Input
                id="savedUrl"
                name="savedUrl"
                type="url"
                placeholder="https://..."
                value={formData.savedUrl}
                onChange={handleChange}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Note'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateNoteDialog;
