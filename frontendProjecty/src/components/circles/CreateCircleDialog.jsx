import { useState } from 'react';
import { UsersRound } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import FriendPicker from '../focus-rooms/FriendPicker';
import circleService from '../../services/circleService';

export const CreateCircleDialog = ({ open, onOpenChange, onCreated }) => {
  const [name, setName] = useState('');
  const [inviteUserIds, setInviteUserIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setName('');
    setInviteUserIds([]);
    setError('');
  };

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const circle = await circleService.createCircle({ name: name.trim(), inviteUserIds });
      onCreated(circle);
      reset();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not create this Circle.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-primary" />Create a Circle</DialogTitle>
          <DialogDescription>A small private space for people who want to show up for their goals together.</DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="circle-name">Circle name</Label>
            <Input id="circle-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g., Final exam crew" maxLength={60} required />
          </div>
          <div className="space-y-2">
            <Label>Invite friends</Label>
            <FriendPicker selected={inviteUserIds} onChange={setInviteUserIds} />
            <p className="text-xs text-muted-foreground">Circles stay private. Only accepted friends can be invited.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting || !name.trim()}>{submitting ? 'Creating...' : 'Create Circle'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCircleDialog;
