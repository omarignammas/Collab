import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import FriendPicker from '../focus-rooms/FriendPicker';

// Generic share dialog reused for both Summaries and Quizzes — sharing here
// is an instant grant (view/take access right away), not an invite the
// friend has to accept.
export const ShareDialog = ({ open, onOpenChange, title, excludeUserIds = [], onShare }) => {
  const [selected, setSelected] = useState([]);
  const [sharing, setSharing] = useState(false);

  const handleClose = () => {
    setSelected([]);
    onOpenChange(false);
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      await onShare(selected);
      setSelected([]);
      onOpenChange(false);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title || 'Share with friends'}</DialogTitle>
          <DialogDescription>They'll be able to view it right away.</DialogDescription>
        </DialogHeader>
        <FriendPicker selected={selected} onChange={setSelected} excludeUserIds={excludeUserIds} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleShare} disabled={sharing || selected.length === 0}>
            {sharing ? 'Sharing...' : 'Share'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
