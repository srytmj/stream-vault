export async function fetchMediaLibrary(forceRefresh = false) {
  const url = forceRefresh ? '/api/media?refresh=true' : '/api/media';
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load media library (Status: ${response.status})`);
  }
  return response.json();
}

export async function fetchServerHealth() {
  const response = await fetch('/api/health');
  if (!response.ok) {
    throw new Error('Server unreachable');
  }
  return response.json();
}

export async function triggerMediaScan() {
  const response = await fetch('/api/media/scan', { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to trigger scan');
  }
  return response.json();
}

export async function fetchLibraries() {
  const response = await fetch('/api/libraries');
  if (!response.ok) {
    throw new Error('Failed to fetch libraries');
  }
  return response.json();
}

export async function createLibrary({ name, path, type }) {
  const response = await fetch('/api/libraries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, path, type }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create library');
  }
  return response.json();
}

export async function removeLibrary(id) {
  const response = await fetch(`/api/libraries/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete library');
  }
  return response.json();
}

export async function browseLibraryFolder(libraryId = '', subpath = '') {
  const params = new URLSearchParams();
  if (libraryId) params.append('libraryId', libraryId);
  if (subpath) params.append('subpath', subpath);

  const response = await fetch(`/api/browse?${params.toString()}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to browse folder');
  }
  return response.json();
}

export async function fetchSubtitleTracks(videoPath) {
  const response = await fetch(`/api/subtitles/tracks?path=${encodeURIComponent(videoPath)}`);
  if (!response.ok) {
    return [];
  }
  return response.json();
}
