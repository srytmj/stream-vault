const TOKEN_KEY = 'sv_token';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Append authentication token to an image or stream URL if not already present
 */
export function appendAuthToken(url) {
  if (!url) return url;
  const token = getStoredToken();
  if (!token) return url;

  const hasQuery = url.includes('?');
  const separator = hasQuery ? '&' : '?';
  if (url.includes('token=')) return url;

  return `${url}${separator}token=${encodeURIComponent(token)}`;
}

/**
 * Fetch wrapper that automatically attaches Authorization Bearer token
 */
export async function apiFetch(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = { ...(options.headers || {}) };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    const errorData = await res.json().catch(() => ({}));
    if (errorData.code === 'AUTH_REQUIRED' || errorData.code === 'AUTH_EXPIRED') {
      // Dispatch custom event for auth logout/prompt
      window.dispatchEvent(new CustomEvent('sv:auth_required', { detail: errorData }));
    }
    throw new Error(errorData.error || 'Authentication required');
  }

  return res;
}

// ==========================================
// Authentication APIs
// ==========================================

export async function loginUser(username, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Login gagal');
  }

  setStoredToken(data.token);
  return data;
}

export async function fetchAuthStatus() {
  const res = await apiFetch('/api/auth/status');
  if (!res.ok) {
    throw new Error('Gagal memeriksa status autentikasi');
  }
  return res.json();
}

export async function fetchAuthProviders() {
  const res = await fetch('/api/auth/providers');
  if (!res.ok) {
    return { local: true, oidc: { enabled: false } };
  }
  return res.json();
}

export async function fetchCurrentUser() {
  const res = await apiFetch('/api/auth/me');
  if (!res.ok) {
    throw new Error('Not authenticated');
  }
  return res.json();
}

export async function logoutUser() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch {}
  setStoredToken(null);
}

export async function changeUserPassword(currentPassword, newPassword) {
  const res = await apiFetch('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Gagal mengubah password');
  }
  return data;
}

// ==========================================
// Media & Libraries APIs
// ==========================================

export async function fetchMediaLibrary(forceRefresh = false) {
  const url = forceRefresh ? '/api/media?refresh=true' : '/api/media';
  const response = await apiFetch(url);
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
  const response = await apiFetch('/api/media/scan', { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to trigger scan');
  }
  return response.json();
}

export async function fetchLibraries() {
  const response = await apiFetch('/api/libraries');
  if (!response.ok) {
    throw new Error('Failed to fetch libraries');
  }
  return response.json();
}

export async function createLibrary({ name, path, type }) {
  const response = await apiFetch('/api/libraries', {
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
  const response = await apiFetch(`/api/libraries/${encodeURIComponent(id)}`, {
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

  const response = await apiFetch(`/api/browse?${params.toString()}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to browse folder');
  }
  return response.json();
}

export async function fetchSubtitleTracks(videoPath) {
  const response = await apiFetch(`/api/subtitles/tracks?path=${encodeURIComponent(videoPath)}`);
  if (!response.ok) {
    return [];
  }
  return response.json();
}

// ==========================================
// Folder Thumbnails APIs (3 Modes)
// ==========================================

export async function fetchFolderConfig(subpath = '') {
  const response = await apiFetch(`/api/folders/config?subpath=${encodeURIComponent(subpath)}`);
  if (!response.ok) {
    throw new Error('Gagal memuat konfigurasi folder');
  }
  return response.json();
}

export async function updateFolderThumbnail({ subpath, mode, file, imageBase64 }) {
  let response;

  if (file) {
    const formData = new FormData();
    formData.append('subpath', subpath);
    formData.append('mode', mode);
    formData.append('file', file);

    const token = getStoredToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    response = await fetch('/api/folders/thumbnail', {
      method: 'POST',
      headers,
      body: formData,
    });
  } else {
    response = await apiFetch('/api/folders/thumbnail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subpath, mode, imageBase64 }),
    });
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Gagal menyimpan thumbnail folder');
  }

  return response.json();
}
