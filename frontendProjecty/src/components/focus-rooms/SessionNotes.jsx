import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, X, Layers } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import Avatar from '../shared/Avatar';
import noteService from '../../services/noteService';

// Groups the room's flat note feed into topic threads by matching title
// (case/whitespace-insensitive) — no separate "topic" entity needed, a topic
// is just whatever title multiple notes happen to share. Newest topic (by its
// most recent note) first, notes within a topic oldest-first (a thread read top-to-bottom).
const groupIntoTopics = (notes) => {
  const byKey = new Map();
  for (const note of notes) {
    const key = note.title.trim().toLowerCase();
    if (!byKey.has(key)) {
      byKey.set(key, { key, title: note.title.trim(), notes: [] });
    }
    byKey.get(key).notes.push(note);
  }
  return [...byKey.values()].sort((a, b) => {
    const aLatest = a.notes[a.notes.length - 1].createdAt;
    const bLatest = b.notes[b.notes.length - 1].createdAt;
    return new Date(bLatest) - new Date(aLatest);
  });
};

export const SessionNotes = ({ roomCode }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(false);
  const titleBoxRef = useRef(null);

  const loadNotes = useCallback(async () => {
    try {
      const result = await noteService.getRoomNotes(roomCode);
      setNotes(result);
    } catch (err) {
      console.error('Error loading session notes:', err);
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  // Notes aren't part of the room's STOMP snapshot — a light poll is enough
  // for "someone jotted a note" (no need for message-grade real-time here),
  // matching the polling pattern already used for other async-ish state in this app.
  useEffect(() => {
    loadNotes();
    const intervalId = setInterval(loadNotes, 4000);
    return () => clearInterval(intervalId);
  }, [loadNotes]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (titleBoxRef.current && !titleBoxRef.current.contains(e.target)) {
        setShowTopicSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const topics = useMemo(() => groupIntoTopics(notes), [notes]);
  const topicTitles = useMemo(() => topics.map((t) => t.title), [topics]);
  const matchingTopics = useMemo(() => {
    if (!title.trim()) return topicTitles;
    return topicTitles.filter((t) => t.toLowerCase().includes(title.trim().toLowerCase()) && t.toLowerCase() !== title.trim().toLowerCase());
  }, [title, topicTitles]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await noteService.createNote({ title: title.trim(), body, roomCode });
      setTitle('');
      setBody('');
      setShowForm(false);
      setShowTopicSuggestions(false);
      await loadNotes();
    } catch (err) {
      console.error('Error adding note:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border/60 bg-card shadow-ios">
      <div className="thin-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? (
          <p className="text-center text-xs text-muted-foreground">Loading notes…</p>
        ) : topics.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground">
            No topics yet — start one below with anything worth remembering.
          </p>
        ) : (
          topics.map((topic) => (
            <div key={topic.key} className="animate-in fade-in rounded-xl border border-border/50 bg-muted/30 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Layers className="h-3.5 w-3.5 shrink-0 text-primary" />
                {topic.title}
              </p>
              <div className="space-y-2.5 border-l border-border/60 pl-3">
                {topic.notes.map((note) => (
                  <div key={note.id}>
                    <div className="mb-1 flex items-center gap-2">
                      <Avatar name={note.userName} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{note.userName}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {format(new Date(note.createdAt), 'HH:mm')}
                      </span>
                    </div>
                    {note.body && <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">{note.body}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-border/60 p-3">
        {showForm ? (
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Add to a topic</span>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div ref={titleBoxRef} className="relative">
              <Input
                placeholder="Topic title — new or existing"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={() => setShowTopicSuggestions(true)}
                autoComplete="off"
                autoFocus
                required
              />
              {showTopicSuggestions && matchingTopics.length > 0 && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border/60 bg-popover shadow-ios-md">
                  {matchingTopics.map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => {
                        setTitle(t);
                        setShowTopicSuggestions(false);
                      }}
                      className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
                    >
                      <Layers className="h-3 w-3 shrink-0 text-primary" />
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Textarea
              placeholder="Anything worth remembering…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
            />
            <Button type="submit" size="sm" className="w-full" disabled={submitting || !title.trim()}>
              {submitting ? 'Saving...' : 'Save Note'}
            </Button>
          </form>
        ) : (
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add a note
          </Button>
        )}
      </div>
    </div>
  );
};

export default SessionNotes;
