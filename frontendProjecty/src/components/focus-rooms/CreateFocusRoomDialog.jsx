import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { Checkbox } from '../ui/checkbox';
import ChatModeSelect from './ChatModeSelect';
import FriendPicker from './FriendPicker';
import focusRoomService from '../../services/focusRoomService';
import courseService from '../../services/courseService';

const DEFAULTS = { workMinutes: 25, breakMinutes: 5, totalRounds: 4, longBreakMinutes: 15 };

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

export const CreateFocusRoomDialog = ({ open, onOpenChange, onRoomCreated }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [courseId, setCourseId] = useState('none');
  const [rounds, setRounds] = useState(DEFAULTS);
  const [chatMode, setChatMode] = useState('CLOSED_FOCUS');
  const [courses, setCourses] = useState([]);
  const [inviteUserIds, setInviteUserIds] = useState([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(undefined);
  const [scheduledTime, setScheduledTime] = useState('12:00');
  const [aiReportEnabled, setAiReportEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      courseService.getAllCourses({ size: 100 }).then((result) => {
        setCourses(result.content || []);
      });
    }
  }, [open]);

  const handleNumberChange = (field) => (e) => {
    const value = Number(e.target.value);
    setRounds((prev) => ({ ...prev, [field]: Number.isNaN(value) ? prev[field] : value }));
  };

  const resetForm = () => {
    setStep(1);
    setName('');
    setCourseId('none');
    setRounds(DEFAULTS);
    setChatMode('CLOSED_FOCUS');
    setInviteUserIds([]);
    setScheduleEnabled(false);
    setScheduledDate(undefined);
    setScheduledTime('12:00');
    setAiReportEnabled(true);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (step === 1) {
      if (!name.trim()) return;
      setStep(2);
      return;
    }

    setError('');
    setLoading(true);
    try {
      let scheduledFor = null;
      if (scheduleEnabled && scheduledDate) {
        const [hours, minutes] = scheduledTime.split(':').map(Number);
        const combined = new Date(scheduledDate);
        combined.setHours(hours, minutes, 0, 0);
        scheduledFor = combined.toISOString();
      }

      const payload = {
        name,
        courseId: courseId !== 'none' ? Number(courseId) : null,
        ...rounds,
        chatMode,
        inviteUserIds,
        scheduledFor,
        aiReportEnabled,
      };
      const room = await focusRoomService.createRoom(payload);
      onRoomCreated(room);
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create focus room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New Focus Room</DialogTitle>
          <DialogDescription>Set up a shared Pomodoro session and invite friends with a code.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 pb-1">
          <StepDot n={1} label="Session details" current={step === 1} done={step > 1} />
          <span className={`h-px flex-1 transition-colors duration-300 ${step > 1 ? 'bg-primary' : 'bg-border'}`} />
          <StepDot n={2} label="People & extras" current={step === 2} done={false} />
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-left-2 space-y-4 py-4 duration-300">
              <div className="space-y-2">
                <Label htmlFor="room-name">Session name *</Label>
                <Input
                  id="room-name"
                  placeholder="e.g., Organic Chem Study Sesh"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Course (optional)</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No course tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No course tag</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={String(course.id)}>{course.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="work-minutes">Work (min)</Label>
                  <Input id="work-minutes" type="number" min={5} max={120} value={rounds.workMinutes} onChange={handleNumberChange('workMinutes')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="break-minutes">Break (min)</Label>
                  <Input id="break-minutes" type="number" min={1} max={60} value={rounds.breakMinutes} onChange={handleNumberChange('breakMinutes')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total-rounds">Rounds</Label>
                  <Input id="total-rounds" type="number" min={1} max={12} value={rounds.totalRounds} onChange={handleNumberChange('totalRounds')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="long-break">Long break (min)</Label>
                  <Input id="long-break" type="number" min={1} max={60} value={rounds.longBreakMinutes} onChange={handleNumberChange('longBreakMinutes')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Chat during focus blocks</Label>
                <ChatModeSelect value={chatMode} onChange={setChatMode} />
                <p className="text-xs text-muted-foreground">You can change this anytime once the room is open.</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-2 space-y-4 py-4 duration-300">
              <div className="space-y-2">
                <Label>Invite friends (optional)</Label>
                <FriendPicker selected={inviteUserIds} onChange={setInviteUserIds} />
              </div>

              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox checked={aiReportEnabled} onCheckedChange={(v) => setAiReportEnabled(Boolean(v))} />
                  <span className="text-sm font-medium text-foreground">Generate an AI recap when this session ends</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  Summarizes the room's chat and notes into a short report for everyone who joined.
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox checked={scheduleEnabled} onCheckedChange={(v) => setScheduleEnabled(Boolean(v))} />
                  <span className="text-sm font-medium text-foreground">Schedule for later</span>
                </label>

                {scheduleEnabled && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={`justify-start text-left font-normal ${!scheduledDate && 'text-muted-foreground'}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {scheduledDate ? format(scheduledDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={scheduledDate}
                          onSelect={setScheduledDate}
                          disabled={(date) => date < new Date().setHours(0, 0, 0, 0)}
                          initialFocus
                          className="rounded-lg border"
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {step === 1 ? (
              <>
                <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                <Button type="submit" disabled={!name.trim()}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Room'}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFocusRoomDialog;
