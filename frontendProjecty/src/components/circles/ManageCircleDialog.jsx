import { useEffect, useState } from 'react';
import { Save, Trash2, UserMinus, UserPlus, UsersRound } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import Avatar from '../shared/Avatar';
import FriendPicker from '../focus-rooms/FriendPicker';
import circleService from '../../services/circleService';

export const ManageCircleDialog = ({ circle, open, onOpenChange, onUpdated, onDeleted }) => {
  const [name, setName] = useState(circle?.name || '');
  const [inviteUserIds, setInviteUserIds] = useState([]);
  const [busyAction, setBusyAction] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && circle) {
      setName(circle.name);
      setInviteUserIds([]);
      setError('');
    }
  }, [circle, open]);

  if (!circle) return null;

  const run = async (action, request) => {
    setBusyAction(action);
    setError('');
    try {
      return await request();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update this Circle.');
      return null;
    } finally {
      setBusyAction(null);
    }
  };

  const saveName = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName === circle.name) return;
    const updated = await run('name', () => circleService.updateCircle(circle.id, { name: trimmedName }));
    if (updated) onUpdated(updated, 'Circle name updated');
  };

  const invite = async () => {
    if (!inviteUserIds.length) return;
    const updated = await run('invite', () => circleService.inviteMembers(circle.id, inviteUserIds));
    if (updated) {
      setInviteUserIds([]);
      onUpdated(updated, 'Invitations sent');
    }
  };

  const removeMember = async (member) => {
    const updated = await run(`remove-${member.userId}`, () => circleService.removeMember(circle.id, member.userId));
    if (updated) onUpdated(updated, `${member.displayName} removed`);
  };

  const deleteCircle = async () => {
    const deleted = await run('delete', async () => {
      await circleService.deleteCircle(circle.id);
      return true;
    });
    if (deleted) {
      onDeleted(circle.id);
      onOpenChange(false);
    }
  };

  const involvedUserIds = circle.members.map((member) => member.userId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-primary" />Manage Circle</DialogTitle>
          <DialogDescription>Update the space and choose who is part of it.</DialogDescription>
        </DialogHeader>

        {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        <div className="space-y-6">
          <section className="space-y-2">
            <Label htmlFor="managed-circle-name">Circle name</Label>
            <div className="flex gap-2">
              <Input id="managed-circle-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={60} />
              <Button type="button" variant="outline" onClick={saveName} disabled={busyAction === 'name' || !name.trim() || name.trim() === circle.name} title="Save Circle name">
                <Save className="h-4 w-4" />
                <span className="sr-only">Save Circle name</span>
              </Button>
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between gap-3">
              <Label>Members</Label>
              <span className="text-xs text-muted-foreground">{circle.activeMemberCount} active · {circle.pendingMemberCount || 0} pending</span>
            </div>
            <div className="divide-y divide-border/60 rounded-xl border border-border/60 px-3">
              {circle.members.map((member) => (
                <div key={member.userId} className="flex items-center gap-3 py-3">
                  <Avatar name={member.displayName} avatarUrl={member.avatarUrl} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{member.displayName}{member.owner && <span className="ml-1 text-xs text-muted-foreground">· owner</span>}</p>
                    <p className="text-xs text-muted-foreground">{member.status === 'INVITED' ? 'Invitation pending' : 'Active Circle member'}</p>
                  </div>
                  {!member.owner && (
                    <Button type="button" size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => removeMember(member)} disabled={busyAction === `remove-${member.userId}`} title={`Remove ${member.displayName}`}>
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div><Label>Add friends</Label><p className="mt-1 text-xs text-muted-foreground">Only accepted friends can join. A Circle can have up to eight people.</p></div>
            <FriendPicker selected={inviteUserIds} onChange={setInviteUserIds} excludeUserIds={involvedUserIds} />
            <Button type="button" variant="outline" onClick={invite} disabled={!inviteUserIds.length || busyAction === 'invite'}>
              <UserPlus className="mr-2 h-4 w-4" />{busyAction === 'invite' ? 'Sending...' : `Invite${inviteUserIds.length ? ` ${inviteUserIds.length}` : ''}`}
            </Button>
          </section>

          <section className="flex items-center justify-between gap-4 border-t border-border/60 pt-5">
            <div><p className="text-sm font-medium text-foreground">Delete Circle</p><p className="mt-0.5 text-xs text-muted-foreground">This permanently removes the Circle for everyone.</p></div>
            <AlertDialog>
              <AlertDialogTrigger asChild><Button type="button" variant="outline" className="shrink-0 text-destructive hover:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Delete {circle.name}?</AlertDialogTitle><AlertDialogDescription>This cannot be undone. Members keep their own tasks and focus history, but this shared Circle disappears.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Keep Circle</AlertDialogCancel><AlertDialogAction onClick={deleteCircle} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={busyAction === 'delete'}>Delete Circle</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>
        </div>

        <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageCircleDialog;
