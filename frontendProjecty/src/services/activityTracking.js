import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@tauri-apps/api/core';

const STORAGE_KEY = 'collab.desktop-activity.v1';
const SETTINGS_KEY = 'collab.desktop-activity.enabled';
const MAX_DAYS = 90;

const APP_RULES = [
  { category: 'Deep work', names: ['Visual Studio Code', 'Cursor', 'Xcode', 'IntelliJ IDEA', 'PyCharm', 'Terminal', 'iTerm'], bundles: ['com.microsoft.VSCode', 'com.todesktop.230313mzl4w4u92', 'com.apple.dt.Xcode', 'com.googlecode.iterm2'] },
  { category: 'Writing', names: ['Notion', 'Obsidian', 'Pages', 'Microsoft Word', 'Google Docs'], bundles: ['notion.id', 'md.obsidian', 'com.apple.iWork.Pages', 'com.microsoft.Word'] },
  { category: 'Design', names: ['Figma', 'Sketch', 'Canva'], bundles: ['com.figma.Desktop', 'com.bohemiancoding.sketch3'] },
  { category: 'Communication', names: ['Slack', 'Microsoft Teams', 'Discord', 'Mail', 'Gmail'], bundles: ['com.tinyspeck.slackmacgap', 'com.microsoft.teams2', 'com.hnc.Discord', 'com.apple.mail'] },
  { category: 'Research', names: ['Google Chrome', 'Safari', 'Firefox', 'Arc', 'Brave Browser'], bundles: ['com.google.Chrome', 'com.apple.Safari', 'org.mozilla.firefox', 'company.thebrowser.Browser', 'com.brave.Browser'] },
];

const formatDay = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isDesktopTrackingAvailable = () => isTauri();

export const getTrackingEnabled = () => localStorage.getItem(SETTINGS_KEY) === 'true';

export const setTrackingEnabled = (enabled) => {
  localStorage.setItem(SETTINGS_KEY, String(Boolean(enabled)));
};

export const classifyApp = ({ name, bundleId }) => {
  const rule = APP_RULES.find((candidate) =>
    candidate.names.includes(name) || candidate.bundles.includes(bundleId)
  );
  return rule?.category || 'Other';
};

export const getFrontmostApp = async () => {
  if (!isDesktopTrackingAvailable()) return null;
  try {
    const app = await invoke('frontmost_app');
    if (!app?.name) return null;
    return { ...app, category: classifyApp(app) };
  } catch (error) {
    console.warn('Could not read active desktop app:', error);
    return null;
  }
};

export const readActivityEntries = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeActivityEntries = (entries) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

export const recordActivity = (app, seconds, now = new Date()) => {
  if (!app?.name || !seconds || app.bundleId === 'com.collab.desktop') return readActivityEntries();

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - MAX_DAYS);
  const day = formatDay(now);
  const key = `${day}:${app.bundleId || app.name}`;
  const entries = readActivityEntries().filter((entry) => new Date(`${entry.day}T00:00:00`) >= cutoff);
  const index = entries.findIndex((entry) => entry.key === key);
  const next = {
    key,
    day,
    name: app.name,
    bundleId: app.bundleId || null,
    category: app.category || 'Other',
    seconds: Math.max(0, Math.round(seconds)),
  };

  if (index >= 0) {
    entries[index] = { ...entries[index], seconds: entries[index].seconds + next.seconds, category: next.category, name: next.name };
  } else {
    entries.push(next);
  }
  writeActivityEntries(entries);
  return entries;
};

export const clearActivityEntries = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const buildActivitySummary = (entries = readActivityEntries(), now = new Date()) => {
  const today = formatDay(now);
  const dayAtOffset = (offset) => {
    const date = new Date(now);
    date.setDate(now.getDate() + offset);
    return formatDay(date);
  };
  const cutoffDay = dayAtOffset(-6);
  const previousWeekStart = dayAtOffset(-13);
  const previousWeekEnd = dayAtOffset(-7);
  const todayEntries = entries.filter((entry) => entry.day === today);
  const weekEntries = entries.filter((entry) => entry.day >= cutoffDay && entry.day <= today);
  const previousWeekEntries = entries.filter(
    (entry) => entry.day >= previousWeekStart && entry.day <= previousWeekEnd
  );
  const totalSeconds = todayEntries.reduce((sum, entry) => sum + entry.seconds, 0);
  const deepWorkSeconds = todayEntries
    .filter((entry) => ['Deep work', 'Writing', 'Design'].includes(entry.category))
    .reduce((sum, entry) => sum + entry.seconds, 0);
  const appMap = new Map();
  const categoryMap = new Map();
  for (const entry of weekEntries) {
    const appKey = entry.bundleId || entry.name;
    const app = appMap.get(appKey) || { ...entry, key: appKey, seconds: 0 };
    app.seconds += entry.seconds;
    appMap.set(appKey, app);
    categoryMap.set(entry.category, (categoryMap.get(entry.category) || 0) + entry.seconds);
  }
  const weeklySeconds = weekEntries.reduce((sum, entry) => sum + entry.seconds, 0);
  const previousWeekSeconds = previousWeekEntries.reduce((sum, entry) => sum + entry.seconds, 0);
  const weeklyChangePercent = previousWeekSeconds
    ? Math.round(((weeklySeconds - previousWeekSeconds) / previousWeekSeconds) * 100)
    : null;
  const topApps = [...appMap.values()]
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 5)
    .map((app) => ({
      ...app,
      percentage: weeklySeconds ? Math.round((app.seconds / weeklySeconds) * 100) : 0,
    }));
  const categories = [...categoryMap.entries()]
    .map(([name, seconds]) => ({
      name,
      seconds,
      percentage: weeklySeconds ? Math.round((seconds / weeklySeconds) * 100) : 0,
    }))
    .sort((a, b) => b.seconds - a.seconds);
  const heatmapDays = Array.from({ length: 56 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (55 - index));
    const day = formatDay(date);
    const seconds = entries.filter((entry) => entry.day === day).reduce((sum, entry) => sum + entry.seconds, 0);
    return { day, seconds };
  });
  const days = heatmapDays.slice(-14);
  const weekDays = heatmapDays.slice(-7);
  const activeWeekDays = weekDays.filter((day) => day.seconds > 0);
  const strongestDay = weekDays.reduce(
    (strongest, day) => (day.seconds > strongest.seconds ? day : strongest),
    { day: today, seconds: 0 }
  );
  const intentionalWeekSeconds = weekEntries
    .filter((entry) => ['Deep work', 'Writing', 'Design'].includes(entry.category))
    .reduce((sum, entry) => sum + entry.seconds, 0);

  return {
    todaySeconds: totalSeconds,
    deepWorkSeconds,
    focusRate: totalSeconds ? Math.round((deepWorkSeconds / totalSeconds) * 100) : 0,
    intentionalWeekRate: weeklySeconds ? Math.round((intentionalWeekSeconds / weeklySeconds) * 100) : 0,
    weeklySeconds,
    previousWeekSeconds,
    weeklyChangePercent,
    activeDays: activeWeekDays.length,
    consistencyRate: Math.round((activeWeekDays.length / 7) * 100),
    averageActiveDaySeconds: activeWeekDays.length ? Math.round(weeklySeconds / activeWeekDays.length) : 0,
    strongestDay,
    topApps,
    categories,
    days,
    heatmapDays,
  };
};

export const formatTrackedTime = (seconds = 0) => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
};
