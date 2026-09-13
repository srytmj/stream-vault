const API_BASE = '';

export async function fetchMediaLibrary(refresh = false) {
  const url = refresh ? '/api/media?refresh=true' : '/api/media';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load media: ${res.statusText}`);
  }
  return res.json();
}

export async function triggerMediaScan() {
  const res = await fetch('/api/media/scan', { method: 'POST' });
  if (!res.ok) {
    throw new Error(`Failed to scan media: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchServerHealth() {
  const res = await fetch('/api/health');
  if (!res.ok) {
    throw new Error(`Failed to check server health: ${res.statusText}`);
  }
  return res.json();
}
