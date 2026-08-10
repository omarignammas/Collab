/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  buildActivitySummary,
  getFrontmostApp,
  getTrackingEnabled,
  isDesktopTrackingAvailable,
  readActivityEntries,
  recordActivity,
  setTrackingEnabled,
} from '../services/activityTracking';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

const ActivityTrackingContext = createContext(null);
const POLL_INTERVAL_MS = 20_000;
const MAX_SAMPLE_SECONDS = 30;

export const ActivityTrackingProvider = ({ children }) => {
  const [enabled, setEnabled] = useState(getTrackingEnabled);
  const [currentApp, setCurrentApp] = useState(null);
  const [entries, setEntries] = useState(readActivityEntries);
  const lastSampleRef = useRef(0);
  const focusContextRef = useRef(null);

  const refresh = useCallback(() => setEntries(readActivityEntries()), []);

  const setTracking = useCallback((nextEnabled) => {
    setTrackingEnabled(nextEnabled);
    setEnabled(Boolean(nextEnabled));
    lastSampleRef.current = Date.now();
    if (!nextEnabled) setCurrentApp(null);
  }, []);

  const setFocusContext = useCallback((context) => {
    focusContextRef.current = context?.active ? context : null;
  }, []);

  useEffect(() => {
    if (!enabled || !isDesktopTrackingAvailable()) return undefined;
    if (isTauri() && getCurrentWindow().label !== 'main') return undefined;

    let cancelled = false;
    const sample = async () => {
      const now = Date.now();
      const app = await getFrontmostApp();
      if (cancelled) return;
      const elapsedSeconds = lastSampleRef.current
        ? Math.min(MAX_SAMPLE_SECONDS, Math.max(0, (now - lastSampleRef.current) / 1000))
        : 0;
      lastSampleRef.current = now;
      setCurrentApp(app);
      if (app && app.bundleId !== 'com.collab.desktop') {
        setEntries(recordActivity(app, elapsedSeconds, new Date(), focusContextRef.current));
      }
    };

    sample();
    const timer = window.setInterval(sample, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled]);

  const value = {
    available: isDesktopTrackingAvailable(),
    enabled,
    setTracking,
    currentApp,
    setFocusContext,
    entries,
    summary: buildActivitySummary(entries),
    refresh,
  };

  return <ActivityTrackingContext.Provider value={value}>{children}</ActivityTrackingContext.Provider>;
};

export const useActivityTracking = () => {
  const context = useContext(ActivityTrackingContext);
  if (!context) throw new Error('useActivityTracking must be used within ActivityTrackingProvider');
  return context;
};

export default ActivityTrackingContext;
