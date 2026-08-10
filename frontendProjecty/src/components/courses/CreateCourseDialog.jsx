import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Plus } from 'lucide-react';
import courseService from '../../services/courseService';
import termService from '../../services/termService';

const COLOR_SWATCHES = [
  { label: 'Amber', value: '#E8B84B' },
  { label: 'Blue', value: '#4B9FE8' },
  { label: 'Purple', value: '#9B6BE8' },
  { label: 'Coral', value: '#E85B4B' },
  { label: 'Teal', value: '#4BE8A0' },
];

export const CreateCourseDialog = ({ open, onOpenChange, onCourseCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructorName: '',
    instructorEmail: '',
  });
  const [colorTag, setColorTag] = useState('');
  const [termId, setTermId] = useState('');
  const [terms, setTerms] = useState([]);
  const [showNewTermForm, setShowNewTermForm] = useState(false);
  const [newTerm, setNewTerm] = useState({ name: '', startDate: '', endDate: '' });
  const [loading, setLoading] = useState(false);
  const [creatingTerm, setCreatingTerm] = useState(false);
  const [error, setError] = useState('');

  const loadTerms = async () => {
    try {
      const result = await termService.getAllTerms({ size: 100 });
      setTerms(result.content || []);
      if (!result.content || result.content.length === 0) {
        setShowNewTermForm(true);
      }
    } catch (err) {
      console.error('Error loading terms:', err);
    }
  };

  useEffect(() => {
    if (open) {
      loadTerms();
    }
  }, [open]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateTerm = async () => {
    setCreatingTerm(true);
    setError('');
    try {
      const created = await termService.createTerm({
        ...newTerm,
        isCurrent: true,
      });
      setTerms((prev) => [...prev, created]);
      setTermId(String(created.id));
      setShowNewTermForm(false);
      setNewTerm({ name: '', startDate: '', endDate: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create term');
    } finally {
      setCreatingTerm(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const newCourse = await courseService.createCourse({
        ...formData,
        termId: Number(termId),
        colorTag: colorTag || null,
      });
      onCourseCreated(newCourse);
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', instructorName: '', instructorEmail: '' });
    setColorTag('');
    setTermId('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create new project</DialogTitle>
          <DialogDescription>
            Create a workspace for its tasks, material, and collaborators.
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
              <Label htmlFor="title">Project title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., React launch"
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
                placeholder="What is this project trying to achieve?"
                value={formData.description}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Term *</Label>
              {!showNewTermForm ? (
                <div className="flex gap-2">
                  <Select value={termId} onValueChange={setTermId}>
                    <SelectTrigger className="flex-1">
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
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowNewTermForm(true)}
                    title="Create new term"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 rounded-md border border-border p-3">
                  <Input
                    placeholder="Term name (e.g., Fall 2026)"
                    value={newTerm.name}
                    onChange={(e) => setNewTerm({ ...newTerm, name: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={newTerm.startDate}
                      onChange={(e) => setNewTerm({ ...newTerm, startDate: e.target.value })}
                    />
                    <Input
                      type="date"
                      value={newTerm.endDate}
                      onChange={(e) => setNewTerm({ ...newTerm, endDate: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    {terms.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNewTermForm(false)}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      disabled={!newTerm.name || !newTerm.startDate || !newTerm.endDate || creatingTerm}
                      onClick={handleCreateTerm}
                    >
                      {creatingTerm ? 'Creating...' : 'Create Term'}
                    </Button>
                  </div>
                </div>
              )}
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
              {loading ? 'Creating...' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCourseDialog;
