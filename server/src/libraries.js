import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const LIBRARIES_FILE = path.join(DATA_DIR, 'libraries.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getDefaultLibraries() {
  const root = config.MEDIA_ROOT;
  const defaults = [];

  const animePath = path.join(root, 'anime');
  if (fs.existsSync(animePath)) {
    defaults.push({
      id: 'anime',
      name: 'Anime Collection',
      path: animePath,
      type: 'anime',
      createdAt: new Date().toISOString(),
    });
  }

  const moviesPath = path.join(root, 'movies');
  if (fs.existsSync(moviesPath)) {
    defaults.push({
      id: 'movies',
      name: 'Movies',
      path: moviesPath,
      type: 'movies',
      createdAt: new Date().toISOString(),
    });
  }

  const tvPath = path.join(root, 'tv');
  if (fs.existsSync(tvPath)) {
    defaults.push({
      id: 'tv',
      name: 'TV Series',
      path: tvPath,
      type: 'tv',
      createdAt: new Date().toISOString(),
    });
  }

  // Fallback if none of the above exist
  if (defaults.length === 0) {
    defaults.push({
      id: 'default',
      name: 'All Media',
      path: root,
      type: 'mixed',
      createdAt: new Date().toISOString(),
    });
  }

  return defaults;
}

export function loadLibraries() {
  ensureDataDir();
  if (!fs.existsSync(LIBRARIES_FILE)) {
    const defaults = getDefaultLibraries();
    saveLibraries(defaults);
    return defaults;
  }

  try {
    const raw = fs.readFileSync(LIBRARIES_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Error loading libraries.json, resetting to defaults:', err.message);
  }

  const defaults = getDefaultLibraries();
  saveLibraries(defaults);
  return defaults;
}

export function saveLibraries(libraries) {
  ensureDataDir();
  fs.writeFileSync(LIBRARIES_FILE, JSON.stringify(libraries, null, 2), 'utf8');
}

export function addLibrary({ name, path: libPath, type = 'mixed' }) {
  const libraries = loadLibraries();
  const normalizedPath = path.resolve(libPath);

  if (!fs.existsSync(normalizedPath)) {
    throw new Error(`Directory does not exist on server: ${normalizedPath}`);
  }

  const id = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_') + '_' + Date.now().toString(36);
  const newLib = {
    id,
    name: name.trim(),
    path: normalizedPath,
    type,
    createdAt: new Date().toISOString(),
  };

  libraries.push(newLib);
  saveLibraries(libraries);
  return newLib;
}

export function deleteLibrary(id) {
  const libraries = loadLibraries();
  const filtered = libraries.filter((lib) => lib.id !== id);
  if (filtered.length === libraries.length) {
    return false;
  }
  saveLibraries(filtered);
  return true;
}

export function getLibraryById(id) {
  const libraries = loadLibraries();
  return libraries.find((lib) => lib.id === id) || null;
}
