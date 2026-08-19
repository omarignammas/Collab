import { useState, useEffect, useRef } from 'react';
import { Camera } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import Avatar from './Avatar';
import userService from '../../services/userService';
import profileService from '../../services/profileService';
import { useAuth } from '../../hooks/useAuth';

export const EditProfileDialog = ({ open, onOpenChange, profile, onProfileUpdated }) => {
  const { user, updateUser } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mission, setMission] = useState('');
  const [openToChat, setOpenToChat] = useState(true);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open && user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setMission(profile?.mission || '');
      setOpenToChat(profile ? profile.openToChat : true);
      setAvatarFile(null);
      setAvatarPreview(null);
      setError('');
    }
  }, [open, user, profile]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let latest = null;
      if (avatarFile) {
        latest = await userService.uploadAvatar(avatarFile);
      }
      const infoChanged = firstName !== user.firstName || lastName !== user.lastName || email !== user.email;
      if (infoChanged) {
        latest = await userService.updateProfile({ firstName, lastName, email });
      }
      if (latest) {
        updateUser(latest);
      }
      const missionChanged = !profile || mission.trim() !== (profile.mission || '') || openToChat !== profile.openToChat;
      let updatedProfile = null;
      if (missionChanged) {
        updatedProfile = await profileService.updateMission({ mission: mission.trim(), openToChat });
      }
      if (updatedProfile) {
        onProfileUpdated?.(updatedProfile);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your photo and account details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col items-center gap-3">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="group relative rounded-full">
                <Avatar name={`${firstName} ${lastName}`} avatarUrl={avatarPreview || user?.avatarUrl} size="xl" />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-5 w-5 text-white" />
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                Change Photo
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-first-name">First Name</Label>
                <Input id="edit-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-last-name">Last Name</Label>
                <Input id="edit-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-mission">Mission</Label>
              <Textarea
                id="edit-mission"
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                placeholder="What are you building toward? Shown on your profile."
                maxLength={280}
                className="min-h-16 resize-none text-sm"
              />
            </div>

            <button
              type="button"
              onClick={() => setOpenToChat((value) => !value)}
              className={`flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                openToChat ? 'border-[hsl(var(--chart-3))]/40 bg-[hsl(var(--chart-3))]/10 text-[hsl(var(--chart-3))]' : 'border-border/70 text-muted-foreground'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${openToChat ? 'bg-[hsl(var(--chart-3))]' : 'bg-muted-foreground/50'}`} />
                Open to chat
              </span>
              <span className="text-xs font-medium">{openToChat ? 'On' : 'Off'}</span>
            </button>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileDialog;
