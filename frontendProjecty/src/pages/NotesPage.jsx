import { useState, useEffect, useMemo } from 'react';
import { Plus, NotebookText, Link2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import NoteCard from '../components/notes/NoteCard';
import CreateNoteDialog from '../components/notes/CreateNoteDialog';
import noteService from '../services/noteService';
import courseService from '../services/courseService';
import PageHero from '../components/shared/PageHero';

export const NotesPage = () => {
  const [notes, setNotes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [courseFilter, setCourseFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [notesResult, coursesResult] = await Promise.all([
        noteService.getAllNotes({ size: 200 }),
        courseService.getAllCourses({ size: 100 }),
      ]);
      setNotes(notesResult.content);
      setCourses(coursesResult.content);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const allTags = useMemo(() => {
    const tags = new Set();
    notes.forEach((n) => n.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [notes]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (courseFilter !== 'all' && String(note.courseId) !== courseFilter) return false;
      if (tagFilter !== 'all' && !note.tags?.includes(tagFilter)) return false;
      return true;
    });
  }, [notes, courseFilter, tagFilter]);

  const regularNotes = filteredNotes.filter((n) => !n.savedUrl);
  const savedArticles = filteredNotes.filter((n) => n.savedUrl);

  const handleNoteCreated = () => {
    fetchData();
    setIsCreateOpen(false);
  };

  const handleNoteDeleted = () => fetchData();

  return (
    <div className="accent-purple w-full px-4 py-10">
      <PageHero
        icon={NotebookText}
        title="Notes"
        subtitle="Everything you've written down, in one place."
        action={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="sm:w-[200px]">
            <SelectValue placeholder="Course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={String(course.id)}>{course.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="sm:w-[160px]">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {allTags.map((tag) => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-border/80 bg-card" />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <h3 className="mb-2 text-lg font-semibold text-foreground">No notes yet</h3>
          <p className="mb-4 text-muted-foreground">Capture what you're learning as you go.</p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Note
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          {regularNotes.length > 0 && (
            <section>
              <h2 className="section-header mb-3">
                <NotebookText className="h-3.5 w-3.5" />
                notes ({regularNotes.length})
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {regularNotes.map((note) => (
                  <NoteCard key={note.id} note={note} onDelete={handleNoteDeleted} />
                ))}
              </div>
            </section>
          )}

          {savedArticles.length > 0 && (
            <section>
              <h2 className="section-header mb-3">
                <Link2 className="h-3.5 w-3.5" />
                saved articles ({savedArticles.length})
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {savedArticles.map((note) => (
                  <NoteCard key={note.id} note={note} onDelete={handleNoteDeleted} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <CreateNoteDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onNoteCreated={handleNoteCreated}
      />
    </div>
  );
};

export default NotesPage;
