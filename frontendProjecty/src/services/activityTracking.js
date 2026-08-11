import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@tauri-apps/api/core';

const STORAGE_KEY = 'collab.desktop-activity.v1';
const ICON_CACHE_KEY = 'collab.desktop-app-icons.v1';
const SETTINGS_KEY = 'collab.desktop-activity.enabled';
const MAX_DAYS = 90;
const MAX_CACHED_ICONS = 16;
const MAX_ICON_DATA_URL_LENGTH = 750_000;
const MAX_ICON_EDGE = 96;

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

const appIdentity = (app) => app?.bundleId || app?.name;

export const readActivityIconCache = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(ICON_CACHE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const writeIconCache = (key, iconDataUrl) => {
  if (!key || !iconDataUrl?.startsWith('data:image/')) return false;

  const cache = readActivityIconCache();
  if (cache[key] === iconDataUrl) return false;
  cache[key] = iconDataUrl;
  const keys = Object.keys(cache);
  while (keys.length > MAX_CACHED_ICONS) delete cache[keys.shift()];
  while (keys.length) {
    try {
      localStorage.setItem(ICON_CACHE_KEY, JSON.stringify(cache));
      return true;
    } catch {
      delete cache[keys.shift()];
    }
  }
  return false;
};

// macOS commonly supplies 512px or 1024px public app icons. Those are too
// large for localStorage once base64-encoded, so create a small local preview
// before caching it for the Insights app list.
const resizeIconForCache = (iconDataUrl) => new Promise((resolve) => {
  if (typeof Image === 'undefined' || typeof document === 'undefined') {
    resolve(null);
    return;
  }

  const image = new Image();
  image.onload = () => {
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (!sourceWidth || !sourceHeight) {
      resolve(null);
      return;
    }

    const scale = Math.min(1, MAX_ICON_EDGE / Math.max(sourceWidth, sourceHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) {
      resolve(null);
      return;
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    try {
      const resized = canvas.toDataURL('image/png');
      resolve(resized.length <= MAX_ICON_DATA_URL_LENGTH ? resized : null);
    } catch {
      resolve(null);
    }
  };
  image.onerror = () => resolve(null);
  image.src = iconDataUrl;
});

const cacheAppIcon = (app, onCached) => {
  const key = appIdentity(app);
  if (
    !key
    || !app.iconDataUrl?.startsWith('data:image/')
  ) return;

  if (app.iconDataUrl.length <= MAX_ICON_DATA_URL_LENGTH) {
    if (writeIconCache(key, app.iconDataUrl)) onCached?.();
    return;
  }

  resizeIconForCache(app.iconDataUrl).then((resizedIcon) => {
    if (resizedIcon && writeIconCache(key, resizedIcon)) onCached?.();
  });
};

export const recordActivity = (app, seconds, now = new Date(), focusContext = null, onIconCached) => {
  if (!app?.name || !seconds || app.bundleId === 'com.collab.desktop') return readActivityEntries();

  cacheAppIcon(app, onIconCached);

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
    focusSeconds: focusContext?.active ? Math.max(0, Math.round(seconds)) : 0,
  };

  if (index >= 0) {
    entries[index] = {
      ...entries[index],
      seconds: entries[index].seconds + next.seconds,
      focusSeconds: (entries[index].focusSeconds || 0) + next.focusSeconds,
      category: next.category,
      name: next.name,
    };
  } else {
    entries.push(next);
  }
  writeActivityEntries(entries);
  return entries;
};

export const clearActivityEntries = () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ICON_CACHE_KEY);
};

export const buildActivitySummary = (
  entries = readActivityEntries(),
  now = new Date(),
  iconCache = readActivityIconCache()
) => {
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
  const focusedAppSeconds = todayEntries.reduce((sum, entry) => sum + (entry.focusSeconds || 0), 0);
  const deepWorkSeconds = todayEntries
    .filter((entry) => ['Deep work', 'Writing', 'Design'].includes(entry.category))
    .reduce((sum, entry) => sum + entry.seconds, 0);
  const appMap = new Map();
  const todayAppMap = new Map();
  const categoryMap = new Map();
  for (const entry of todayEntries) {
    const appKey = entry.bundleId || entry.name;
    const app = todayAppMap.get(appKey) || { ...entry, key: appKey, seconds: 0, focusSeconds: 0 };
    app.seconds += entry.seconds;
    app.focusSeconds += entry.focusSeconds || 0;
    todayAppMap.set(appKey, app);
  }
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
      iconDataUrl: iconCache[app.key] || null,
      percentage: weeklySeconds ? Math.round((app.seconds / weeklySeconds) * 100) : 0,
    }));
  const todayTopApps = [...todayAppMap.values()]
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 3)
    .map((app) => ({
      ...app,
      iconDataUrl: iconCache[app.key] || null,
      percentage: totalSeconds ? Math.round((app.seconds / totalSeconds) * 100) : 0,
    }));
  const todayFocusApps = [...todayAppMap.values()]
    .filter((app) => (app.focusSeconds || 0) > 0)
    .sort((a, b) => (b.focusSeconds || 0) - (a.focusSeconds || 0))
    .slice(0, 3)
    .map((app) => ({
      ...app,
      iconDataUrl: iconCache[app.key] || null,
      focusPercentage: focusedAppSeconds
        ? Math.round(((app.focusSeconds || 0) / focusedAppSeconds) * 100)
        : 0,
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
    focusedAppSeconds,
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
    todayTopApps,
    todayFocusApps,
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
