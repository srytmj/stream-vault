const HISTORY_KEY = 'stream_vault_watch_history';
const PREFS_KEY = 'stream_vault_preferences';

export function getWatchHistory() {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function saveWatchProgress(item, currentTime, duration) {
  if (!item || !duration || isNaN(currentTime)) return;
  try {
    const history = getWatchHistory();
    const progress = Math.min(100, Math.round((currentTime / duration) * 100));

    // If watched more than 95%, we can consider it completed
    const completed = progress > 95;

    history[item.id] = {
      id: item.id,
      title: item.title,
      showName: item.showName,
      relativePath: item.relativePath,
      category: item.category,
      posterUrl: item.posterUrl,
      currentTime: Math.floor(currentTime),
      duration: Math.floor(duration),
      progress,
      completed,
      updatedAt: Date.now(),
      season: item.season,
      episode: item.episode,
    };

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (err) {
    console.error('Failed to save watch progress:', err);
  }
}

export function getSavedProgress(itemId) {
  const history = getWatchHistory();
  return history[itemId] || null;
}

export function removeWatchHistory(itemId) {
  try {
    const history = getWatchHistory();
    delete history[itemId];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (err) {
    console.error('Failed to remove history item:', err);
  }
}

export function clearAllHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (err) {
    console.error('Failed to clear history:', err);
  }
}

export function getPreferences() {
  try {
    const data = localStorage.getItem(PREFS_KEY);
    return data ? JSON.parse(data) : { volume: 1, autoplayNext: true, autoResume: true };
  } catch {
    return { volume: 1, autoplayNext: true, autoResume: true };
  }
}

export function savePreferences(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.error('Failed to save preferences:', err);
  }
}
