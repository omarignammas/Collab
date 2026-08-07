import { useCallback, useEffect, useRef, useState } from 'react';
import voiceService from '../services/voiceService';

// Groq's transcription endpoint accepts webm/mp4/ogg/wav/etc, but WKWebView
// (Tauri on macOS) and Chromium-based WebView2 (Tauri on Windows) support
// different MediaRecorder output codecs — pick whatever the runtime supports.
const RECORDING_MIME_CANDIDATES = ['audio/webm', 'audio/mp4', 'audio/ogg'];
const pickSupportedMimeType = () =>
  RECORDING_MIME_CANDIDATES.find((type) => window.MediaRecorder?.isTypeSupported?.(type));

const MAX_RECORDING_MS = 120_000;
const SILENCE_THRESHOLD = 6; // avg sample deviation from center (0-128 scale) counted as "quiet"
const SILENCE_DURATION_MS = 3_000; // leave room for a natural pause before auto-stopping
const SILENCE_GRACE_MS = 1_000; // give the speaker a full beat before silence detection starts

// Records from the mic, auto-stops after a stretch of silence (or hits the
// hard cap), transcribes, and hands the text to onTranscribed. Shared by the
// main chat composer and the tray widget so both behave identically instead
// of duplicating this — silence detection especially isn't the kind of logic
// worth having two copies of.
export function useVoiceRecorder({ onTranscribed, onError } = {}) {
  const [state, setState] = useState('idle'); // idle | recording | transcribing
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const maxDurationTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const silenceRafRef = useRef(null);
  const silenceStartRef = useRef(null);
  const recordingStartRef = useRef(null);

  const cleanupAudioAnalysis = useCallback(() => {
    if (silenceRafRef.current) cancelAnimationFrame(silenceRafRef.current);
    silenceRafRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      clearTimeout(maxDurationTimeoutRef.current);
      cleanupAudioAnalysis();
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    },
    [cleanupAudioAnalysis]
  );

  const startRecording = useCallback(async () => {
    if (state !== 'idle') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        clearTimeout(maxDurationTimeoutRef.current);
        cleanupAudioAnalysis();

        if (chunksRef.current.length === 0) {
          setState('idle');
          return;
        }

        setState('transcribing');
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          const { text } = await voiceService.transcribe(blob);
          const trimmed = text?.trim();
          if (trimmed) onTranscribed?.(trimmed);
        } catch (err) {
          onError?.(err);
        } finally {
          setState('idle');
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      recordingStartRef.current = Date.now();
      silenceStartRef.current = null;
      setState('recording');

      maxDurationTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      }, MAX_RECORDING_MS);

      // Watch the mic's live volume and auto-stop once it's stayed quiet long
      // enough that the user is clearly done talking — no click required.
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const checkVolume = () => {
          if (mediaRecorderRef.current?.state !== 'recording') return;
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i += 1) sum += Math.abs(data[i] - 128);
          const avgDeviation = sum / data.length;

          if (Date.now() - recordingStartRef.current > SILENCE_GRACE_MS) {
            if (avgDeviation < SILENCE_THRESHOLD) {
              if (silenceStartRef.current == null) silenceStartRef.current = Date.now();
              else if (Date.now() - silenceStartRef.current > SILENCE_DURATION_MS) {
                mediaRecorderRef.current.stop();
                return;
              }
            } else {
              silenceStartRef.current = null;
            }
          }
          silenceRafRef.current = requestAnimationFrame(checkVolume);
        };
        silenceRafRef.current = requestAnimationFrame(checkVolume);
      }
    } catch (err) {
      setState('idle');
      onError?.(err);
    }
  }, [state, onTranscribed, onError, cleanupAudioAnalysis]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  }, []);

  const toggleRecording = useCallback(() => {
    if (state === 'recording') stopRecording();
    else if (state === 'idle') startRecording();
  }, [state, startRecording, stopRecording]);

  return { state, toggleRecording, stopRecording, startRecording };
}

export default useVoiceRecorder;
