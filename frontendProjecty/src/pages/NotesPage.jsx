import { useState, useEffect, useMemo } from 'react';
import { Plus, NotebookText, Search, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
  const [projectFilter, setProjectFilter] = useState('all');
  const [themeFilter, setThemeFilter] = useState('all');
  const [search, setSearch] = useState('');

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

  useEffect(() => {
    if (!notes.some((note) => note.enrichmentStatus === 'PENDING')) return undefined;
    const timer = setInterval(fetchData, 3500);
    return () => clearInterval(timer);
  }, [notes]);

  const themes = useMemo(() => [...new Set(notes.map((note) => note.theme).filter(Boolean))].sort(), [notes]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (projectFilter !== 'all' && String(note.courseId) !== projectFilter) return false;
      if (themeFilter !== 'all' && note.theme !== themeFilter) return false;
      const query = search.trim().toLowerCase();
      if (query) {
        const haystack = [note.title, note.body, note.theme, ...(note.tags || [])].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [notes, projectFilter, themeFilter, search]);

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
        subtitle="Capture freely. Collab formats, connects, and organizes the useful parts."
        action={
          <div className="flex w-full flex-col gap-2 min-[420px]:flex-row sm:w-auto">
            <span className="hidden h-10 items-center justify-center gap-2 rounded-lg border border-border/80 bg-card px-3 text-xs text-muted-foreground md:inline-flex"><Sparkles className="h-3.5 w-3.5 text-primary" />Desktop shortcut <kbd className="font-numeric text-foreground">Ctrl Alt N</kbd></span>
            <Button className="w-full min-[420px]:w-auto" onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New note
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes, themes, and topics..." className="pl-10" />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="sm:w-[200px]">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={String(course.id)}>{course.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

      </div>

      {themes.length > 0 && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1" aria-label="Note themes">
          {['all', ...themes].map((theme) => (
            <button key={theme} type="button" onClick={() => setThemeFilter(theme)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${themeFilter === theme ? 'border-primary/40 bg-primary/12 text-primary' : 'border-border/70 bg-card text-muted-foreground hover:text-foreground'}`}>
              {theme === 'all' ? 'All themes' : theme}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="mb-4 h-40 break-inside-avoid animate-pulse rounded-xl border border-border/80 bg-card" />
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
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
          {filteredNotes.map((note) => (
            <div key={note.id} className="mb-4 break-inside-avoid">
              <NoteCard note={note} onDelete={handleNoteDeleted} />
            </div>
          ))}
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
