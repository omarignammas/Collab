import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFocusSession } from '../context/FocusSessionContext';
import { useToast } from '../hooks/use-toast';
import focusRoomService from '../services/focusRoomService';
import RoomLobby from '../components/focus-rooms/RoomLobby';
import LiveSession from '../components/focus-rooms/LiveSession';
import SessionRecap from '../components/focus-rooms/SessionRecap';
import { Button } from '../components/ui/button';

export const FocusRoomPage = () => {
  const { roomCode } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    room,
    setRoom,
    activeRoomCode,
    connected,
    error,
    clearError,
    sendStart,
    sendHand,
    sendChat,
    sendChatMode,
    leaveRoom,
    endRoomSession,
    joinSession,
    disconnectIfDone,
    remaining,
    ringPercentage,
    isHost,
    shareFocusSignal,
    setShareFocusSignal,
    desktopTrackingEnabled,
  } = useFocusSession();

  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  // If this room is already the one the session context is connected to —
  // returning from another page while it's still running — there's nothing
  // to fetch; the live state has been ticking along the whole time. Only a
  // genuinely fresh visit needs the REST snapshot + join round-trip.
  useEffect(() => {
    if (activeRoomCode === roomCode) {
      setLoading(false);
      setLoadError('');
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const snapshot = await focusRoomService.getRoomByCode(roomCode);
        const myParticipant = snapshot.participants.find((p) => p.email === user.email);
        const needsJoin =
          (!myParticipant ||
            myParticipant.status === 'INVITED' ||
            myParticipant.status === 'QUIT' ||
            myParticipant.status === 'DECLINED') &&
          snapshot.status !== 'COMPLETED';
        const finalSnapshot = needsJoin ? await focusRoomService.joinRoom(roomCode) : snapshot;
        if (!cancelled) {
          setRoom(finalSnapshot);
          joinSession(roomCode);
          setLoadError('');
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err.response?.data?.message || 'Focus room not found');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, activeRoomCode]);

  // Only disconnects if this room's session has actually ended — an ACTIVE
  // session stays connected (and keeps updating the tray/widget) after
  // navigating away; a COMPLETED one has nothing left to stay connected for.
  useEffect(() => {
    return () => disconnectIfDone(roomCode);
  }, [roomCode, disconnectIfDone]);

  useEffect(() => {
    if (error) {
      toast({ title: 'Focus Room', description: error, variant: 'destructive' });
      clearError();
    }
  }, [error, toast, clearError]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="mx-auto h-64 max-w-xl animate-pulse rounded-xl border border-border/80 bg-card" />
      </div>
    );
  }

  if (loadError || !room) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <AlertTriangle className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
        <h2 className="mb-2 text-lg font-semibold text-foreground">{loadError || 'Focus room not found'}</h2>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/focus-rooms">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Focus Rooms
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="accent-teal flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden px-4 py-10">
      {room.status === 'LOBBY' && (
        <RoomLobby
          room={room}
          isHost={isHost}
          userEmail={user.email}
          onStart={sendStart}
          onChatModeChange={sendChatMode}
          connected={connected}
        />
      )}
      {room.status === 'ACTIVE' && (
        <LiveSession
          room={room}
          userEmail={user.email}
          isHost={isHost}
          remaining={remaining}
          ringPercentage={ringPercentage}
          onEnd={endRoomSession}
          onLeave={leaveRoom}
          sendHand={sendHand}
          sendChat={sendChat}
          sendChatMode={sendChatMode}
          shareFocusSignal={shareFocusSignal}
          onShareFocusSignalChange={setShareFocusSignal}
          desktopTrackingEnabled={desktopTrackingEnabled}
        />
      )}
      {room.status === 'COMPLETED' && <SessionRecap room={room} userEmail={user.email} />}
    </div>
  );
};

export default FocusRoomPage;
