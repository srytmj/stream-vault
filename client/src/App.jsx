import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FolderTree,
  FolderPlus,
  Loader2,
  AlertCircle,
  Film,
  Sparkles,
  Tv,
  Folder,
  Trash2,
  Home,
  Activity,
  Layers,
} from 'lucide-react';
import Navbar from './components/Navbar';
import MediaGrid from './components/MediaGrid';
import VideoPlayer from './components/VideoPlayer';
import SeriesModal from './components/SeriesModal';
import ContinueWatching from './components/ContinueWatching';
import JellyfinHome from './components/JellyfinHome';
import StatsModal from './components/StatsModal';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import AddLibraryModal from './components/AddLibraryModal';
import FolderExplorer from './components/FolderExplorer';
import LoginPage from './components/LoginPage';
import ChangePasswordModal from './components/ChangePasswordModal';
import { useAuth } from './context/AuthContext';
import {
  fetchMediaLibrary,
  fetchServerHealth,
  triggerMediaScan,
  fetchLibraries,
  removeLibrary,
} from './utils/api';
import {
  getWatchHistoryList,
  removeWatchHistory,
  clearAllHistory,
} from './utils/storage';

// Helper: Parse URL parameters into structured state
function parseRouteParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    tab: params.get('tab') || 'home',
    category: params.get('cat') || 'all',
    libraryId: params.get('lib') || null,
    subpath: params.get('path') || '',
    watchId: params.get('watch') || null,
    seriesId: params.get('series') || null,
    search: params.get('q') || '',
  };
}

// Helper: Find media item across items, allItems, and series episodes
function findMediaById(id, libraryData) {
  if (!id || !libraryData) return null;
  // Search standalone items
  const direct = libraryData.items?.find((i) => i.id === id);
  if (direct) return direct;
  // Search flat allItems list if present
  if (libraryData.allItems) {
    const fromAll = libraryData.allItems.find((i) => i.id === id);
    if (fromAll) return fromAll;
  }
  // Search episodes inside series
  for (const s of libraryData.series || []) {
    const ep = s.episodes?.find((e) => e.id === id);
    if (ep) return ep;
  }
  return null;
}

export default function App() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [libraryData, setLibraryData] = useState({ items: [], series: [], allItems: [] });
  const [libraries, setLibraries] = useState([]);
  const [serverHealth, setServerHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // App Navigation & View Modes initialized from URL
  const initialRoute = useRef(parseRouteParams());
  const [activeTab, setActiveTab] = useState(initialRoute.current.tab);
  const [selectedCategory, setSelectedCategory] = useState(initialRoute.current.category);
  const [searchQuery, setSearchQuery] = useState(initialRoute.current.search);
  const [activeLibrary, setActiveLibrary] = useState(null);
  const [explorerSubpath, setExplorerSubpath] = useState(initialRoute.current.subpath);

  const [displayMode, setDisplayMode] = useState(() => {
    return localStorage.getItem('sv_display_mode') || 'grid';
  });

  // Modals & Player State
  const [currentVideo, setCurrentVideo] = useState(null);
  const [activeSeriesModal, setActiveSeriesModal] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showAddLibraryModal, setShowAddLibraryModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [watchHistory, setWatchHistory] = useState([]);

  // Store mutable references for route handlers to avoid stale closures
  const librariesRef = useRef(libraries);
  librariesRef.current = libraries;
  const libraryDataRef = useRef(libraryData);
  libraryDataRef.current = libraryData;

  const handleDisplayModeChange = (mode) => {
    setDisplayMode(mode);
    localStorage.setItem('sv_display_mode', mode);
  };

  // Synchronize state changes to URL query string
  const syncToUrl = useCallback((partialState = {}, replace = false) => {
    const current = parseRouteParams();
    const next = { ...current, ...partialState };

    const params = new URLSearchParams();
    if (next.tab && next.tab !== 'home') params.set('tab', next.tab);
    if (next.category && next.category !== 'all') params.set('cat', next.category);
    if (next.libraryId) params.set('lib', next.libraryId);
    if (next.subpath) params.set('path', next.subpath);
    if (next.watchId) params.set('watch', next.watchId);
    if (next.seriesId) params.set('series', next.seriesId);
    if (next.search) params.set('q', next.search);

    const queryString = params.toString();
    const targetUrl = queryString ? `?${queryString}` : window.location.pathname;
    const currentFull = `${window.location.pathname}${window.location.search}`;

    if (targetUrl !== currentFull) {
      if (replace) {
        window.history.replaceState({ sv: true }, '', targetUrl);
      } else {
        window.history.pushState({ sv: true }, '', targetUrl);
      }
    }
  }, []);

  // Popstate listener for seamless browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const route = parseRouteParams();
      setActiveTab(route.tab);
      setSelectedCategory(route.category);
      setSearchQuery(route.search);
      setExplorerSubpath(route.subpath);

      // Match Library
      if (route.libraryId) {
        const lib = librariesRef.current.find((l) => l.id === route.libraryId);
        setActiveLibrary(lib || null);
      } else {
        setActiveLibrary(null);
      }

      // Match Video Player
      if (route.watchId) {
        const item = findMediaById(route.watchId, libraryDataRef.current);
        if (item) setCurrentVideo(item);
      } else {
        setCurrentVideo(null);
      }

      // Match Series Modal
      if (route.seriesId) {
        const series = libraryDataRef.current.series?.find((s) => s.id === route.seriesId);
        if (series) setActiveSeriesModal(series);
      } else {
        setActiveSeriesModal(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        return;
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      }

      if (e.key === 'Escape') {
        if (showStatsModal) setShowStatsModal(false);
        if (showShortcutsModal) setShowShortcutsModal(false);
        if (showAddLibraryModal) setShowAddLibraryModal(false);
        if (showChangePasswordModal) setShowChangePasswordModal(false);
        if (activeSeriesModal) {
          setActiveSeriesModal(null);
          syncToUrl({ seriesId: null });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showStatsModal, showShortcutsModal, showAddLibraryModal, showChangePasswordModal, activeSeriesModal, syncToUrl]);

  // Load libraries and initial media catalog
  const loadData = useCallback(async (force = false) => {
    if (!isAuthenticated) return;
    try {
      setError(null);
      const [mediaRes, healthRes, libsRes] = await Promise.all([
        fetchMediaLibrary(force),
        fetchServerHealth().catch(() => null),
        fetchLibraries().catch(() => []),
      ]);

      setLibraryData(mediaRes);
      setServerHealth(healthRes);
      setLibraries(libsRes);
      setWatchHistory(getWatchHistoryList());

      // Resolve deep-linked items from initial URL route
      const initial = initialRoute.current;
      if (initial.libraryId) {
        const foundLib = libsRes.find((l) => l.id === initial.libraryId);
        if (foundLib) setActiveLibrary(foundLib);
      }
      if (initial.watchId) {
        const foundVideo = findMediaById(initial.watchId, mediaRes);
        if (foundVideo) setCurrentVideo(foundVideo);
      }
      if (initial.seriesId) {
        const foundSeries = mediaRes.series?.find((s) => s.id === initial.seriesId);
        if (foundSeries) setActiveSeriesModal(foundSeries);
      }
    } catch (err) {
      setError(err.message || 'Failed to load media vault');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manual rescan trigger
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await triggerMediaScan();
      await loadData(true);
    } catch (err) {
      setError('Rescan error: ' + err.message);
      setIsRefreshing(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab !== 'catalog') {
      setSearchQuery('');
    }
    syncToUrl({ tab, libraryId: tab === 'explorer' ? activeLibrary?.id : null });
  };

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    syncToUrl({ category: cat });
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    syncToUrl({ search: query || null }, true);
  };

  // Open a specific library inside the Folder Explorer
  const handleOpenFolderLibrary = (lib) => {
    setActiveLibrary(lib);
    setExplorerSubpath('');
    setActiveTab('explorer');
    syncToUrl({ tab: 'explorer', libraryId: lib.id, subpath: null });
  };

  // Selection from Home or other parts
  const handleSelectLibrary = (lib) => {
    if (activeTab === 'explorer') {
      handleOpenFolderLibrary(lib);
    } else {
      setSelectedCategory(lib.type?.toLowerCase() || 'all');
      setActiveTab('catalog');
      syncToUrl({ tab: 'catalog', category: lib.type?.toLowerCase() || 'all', libraryId: null, subpath: null });
    }
  };

  const handleBackToLibraries = () => {
    setActiveLibrary(null);
    setExplorerSubpath('');
    syncToUrl({ tab: 'explorer', libraryId: null, subpath: null });
  };

  const handleExplorerNavigate = (subpath) => {
    setExplorerSubpath(subpath);
    syncToUrl({ tab: 'explorer', libraryId: activeLibrary?.id, subpath: subpath || null });
  };

  const handlePlayMedia = (item) => {
    setCurrentVideo(item);
    syncToUrl({ watchId: item.id });
  };

  const handleBackFromPlayer = () => {
    setCurrentVideo(null);
    setWatchHistory(getWatchHistoryList());
    if (window.history.state?.sv) {
      window.history.back();
    } else {
      syncToUrl({ watchId: null }, true);
    }
  };

  const handleRemoveHistory = (id) => {
    removeWatchHistory(id);
    setWatchHistory(getWatchHistoryList());
  };

  const handleClearHistory = () => {
    clearAllHistory();
    setWatchHistory([]);
  };

  const handleViewSeries = (series) => {
    setActiveSeriesModal(series);
    syncToUrl({ seriesId: series.id });
  };

  const handleCloseSeriesModal = () => {
    setActiveSeriesModal(null);
    if (window.history.state?.sv && parseRouteParams().seriesId) {
      window.history.back();
    } else {
      syncToUrl({ seriesId: null }, true);
    }
  };

  const handleDeleteLibrary = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this library? Files on disk are not deleted.')) {
      return;
    }
    try {
      await removeLibrary(id);
      setLibraries((prev) => prev.filter((l) => l.id !== id));
      if (activeLibrary?.id === id) {
        setActiveLibrary(null);
      }
    } catch (err) {
      alert('Failed to remove library: ' + err.message);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-vault-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-vault-accent animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-400">Connecting to StreamVault...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-vault-950 text-slate-100 flex flex-col selection:bg-vault-accent selection:text-white pb-20 md:pb-10">
      {/* Top Application Header */}
      <Navbar
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategoryChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenStats={() => setShowStatsModal(true)}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onOpenChangePassword={() => setShowChangePasswordModal(true)}
        totalFiles={libraryData.totalFiles}
        totalSize={libraryData.totalSizeBytes}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Loading Spinner */}
        {loading && (
          <div className="py-40 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-vault-accent animate-spin mb-4" />
            <h3 className="text-lg font-bold text-white">Loading Your Media Vault</h3>
            <p className="text-sm text-slate-400 mt-1">
              Scanning directories and streaming endpoints...
            </p>
          </div>
        )}

        {/* Global Error Banner */}
        {error && !loading && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between text-red-400">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
            <button
              onClick={() => loadData(true)}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-xs font-semibold rounded-lg transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* TAB 1: JELLYFIN STYLE HOMELAB DASHBOARD */}
        {!loading && !error && activeTab === 'home' && (
          <JellyfinHome
            libraries={libraries}
            mediaItems={libraryData.items}
            seriesList={libraryData.series}
            watchHistory={watchHistory}
            onPlayMedia={handlePlayMedia}
            onViewSeries={handleViewSeries}
            onSelectLibrary={handleSelectLibrary}
            onNavigateToCatalog={() => handleTabChange('catalog')}
            onNavigateToFolders={() => handleTabChange('explorer')}
            onOpenAddLibrary={() => setShowAddLibraryModal(true)}
            onRemoveHistory={handleRemoveHistory}
          />
        )}

        {/* TAB 2: CATALOG EXPLORER (Grid, Compact List, Table Details) */}
        {!loading && !error && activeTab === 'catalog' && (
          <MediaGrid
            items={libraryData.items}
            series={libraryData.series}
            selectedCategory={selectedCategory}
            searchQuery={searchQuery}
            displayMode={displayMode}
            onDisplayModeChange={handleDisplayModeChange}
            onPlayMedia={handlePlayMedia}
            onViewSeries={handleViewSeries}
          />
        )}

        {/* TAB 3: HIERARCHICAL FOLDER EXPLORER (True Folders-First View) */}
        {!loading && !error && activeTab === 'explorer' && (
          <div>
            {!activeLibrary ? (
              /* Library Selection Overview */
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      <FolderTree className="w-5 h-5 text-vault-accent" />
                      <span>Libraries & Folders</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Explore directory structures and files with direct stream playback
                    </p>
                  </div>

                  <button
                    onClick={() => setShowAddLibraryModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-vault-accent hover:bg-vault-accent-hover text-white rounded-xl text-xs font-semibold shadow-md shadow-vault-accent/20 transition"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Add Source</span>
                  </button>
                </div>

                {/* Libraries Card Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {libraries.map((lib) => {
                    const isAnime = lib.type === 'anime';
                    const isMovie = lib.type === 'movies';
                    const isTv = lib.type === 'tv';

                    return (
                      <div
                        key={lib.id}
                        onClick={() => handleOpenFolderLibrary(lib)}
                        className="group relative flex flex-col p-5 bg-vault-900 border border-white/10 hover:border-vault-accent/60 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] shadow-md hover:shadow-xl"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-vault-accent group-hover:scale-105 transition-transform">
                            {isAnime ? (
                              <Sparkles className="w-5 h-5 text-amber-400" />
                            ) : isMovie ? (
                              <Film className="w-5 h-5 text-rose-400" />
                            ) : isTv ? (
                              <Tv className="w-5 h-5 text-cyan-400" />
                            ) : (
                              <Folder className="w-5 h-5 text-vault-accent" />
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/40 text-slate-400 border border-white/10">
                              {lib.type}
                            </span>
                            {!['anime', 'movies', 'tv', 'default'].includes(lib.id) && (
                              <button
                                onClick={(e) => handleDeleteLibrary(lib.id, e)}
                                className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-white/5 transition"
                                title="Remove Library"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <h3 className="text-base font-bold text-white group-hover:text-vault-accent transition mb-1">
                          {lib.name}
                        </h3>

                        <p className="text-xs font-mono text-slate-400 bg-black/30 px-2.5 py-1 rounded-lg border border-white/5 truncate mb-4">
                          {lib.path}
                        </p>

                        <div className="mt-auto flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/10">
                          <span className="flex items-center gap-1 text-vault-accent font-semibold group-hover:translate-x-1 transition-transform">
                            <span>Browse Files</span>
                            <span>&rarr;</span>
                          </span>
                          <span className="text-[11px] text-slate-500">Direct Play</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Active Folder Explorer for Selected Library */
              <FolderExplorer
                library={activeLibrary}
                initialSubpath={explorerSubpath}
                onNavigate={handleExplorerNavigate}
                onSelectVideo={handlePlayMedia}
                onBackToLibraries={handleBackToLibraries}
              />
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Jellyfin Style) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-vault-950/95 backdrop-blur-md border-t border-white/10 flex md:hidden items-center justify-around py-2 px-2">
        <button
          onClick={() => handleTabChange('home')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition ${
            activeTab === 'home' ? 'text-vault-accent font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </button>

        <button
          onClick={() => handleTabChange('catalog')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition ${
            activeTab === 'catalog' ? 'text-vault-accent font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px]">Catalog</span>
        </button>

        <button
          onClick={() => handleTabChange('explorer')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition ${
            activeTab === 'explorer' ? 'text-vault-accent font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderTree className="w-5 h-5" />
          <span className="text-[10px]">Folders</span>
        </button>

        <button
          onClick={() => setShowStatsModal(true)}
          className="flex flex-col items-center gap-1 py-1 px-4 rounded-xl text-slate-400 hover:text-slate-200 transition"
        >
          <Activity className="w-5 h-5" />
          <span className="text-[10px]">Server</span>
        </button>
      </nav>

      {/* Series Episodes Drawer/Modal */}
      {activeSeriesModal && (
        <SeriesModal
          series={activeSeriesModal}
          isOpen={Boolean(activeSeriesModal)}
          onClose={handleCloseSeriesModal}
          onPlayEpisode={(ep) => {
            handlePlayMedia(ep);
            handleCloseSeriesModal();
          }}
        />
      )}

      {/* Add Library Modal */}
      <AddLibraryModal
        isOpen={showAddLibraryModal}
        onClose={() => setShowAddLibraryModal(false)}
        onCreated={(newLib) => {
          setLibraries((prev) => [...prev, newLib]);
          handleOpenFolderLibrary(newLib);
        }}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />

      {/* Diagnostics / Stats Modal */}
      {showStatsModal && (
        <StatsModal
          stats={serverHealth}
          isOpen={showStatsModal}
          onClose={() => setShowStatsModal(false)}
        />
      )}

      {/* Keyboard Shortcuts Helper */}
      {showShortcutsModal && (
        <KeyboardShortcutsModal
          isOpen={showShortcutsModal}
          onClose={() => setShowShortcutsModal(false)}
        />
      )}
    </div>
  );
}
