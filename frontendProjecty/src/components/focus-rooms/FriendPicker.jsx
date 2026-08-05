import { useState, useEffect } from 'react';
import { Checkbox } from '../ui/checkbox';
import Avatar from '../shared/Avatar';
import friendService from '../../services/friendService';

export const FriendPicker = ({ selected, onChange, excludeUserIds = [] }) => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    friendService.getFriends().then((result) => {
      setFriends(result.content || []);
      setLoading(false);
    });
  }, []);

  const toggle = (userId) => {
    if (selected.includes(userId)) {
      onChange(selected.filter((id) => id !== userId));
    } else {
      onChange([...selected, userId]);
    }
  };

  const available = friends.filter((f) => !excludeUserIds.includes(f.userId));

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading friends...</p>;
  }
  if (available.length === 0) {
    return <p className="text-sm text-muted-foreground">No friends to invite yet — add some from the Friends page.</p>;
  }

  return (
    <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border/60 bg-muted/20 p-2">
      {available.map((friend) => (
        <label key={friend.userId} className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-accent">
          <Checkbox checked={selected.includes(friend.userId)} onCheckedChange={() => toggle(friend.userId)} />
          <Avatar name={friend.displayName} avatarUrl={friend.avatarUrl} size="sm" />
          <span className="min-w-0 flex-1 truncate text-sm text-foreground">{friend.displayName}</span>
        </label>
      ))}
    </div>
  );
};

export default FriendPicker;
