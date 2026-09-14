import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Film,
  Tv,
  Folder,
  FolderTree,
  FolderPlus,
  Trash2,
  HardDrive,
  Layers,
  Clock,
  Loader2,
  AlertCircle,
  Play,
  Check,
} from 'lucide-react';
import Navbar from './components/Navbar';
import MediaGrid from './components/MediaGrid';
import VideoPlayer from './components/VideoPlayer';
import SeriesModal from './components/SeriesModal';
import ContinueWatching from './components/ContinueWatching';
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
import { getWatchHistory } from './utils/storage';

export default function App() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [libraryData, setLibraryData] = useState({ items: [], series: [] });
  const [libraries, setLibraries] = useState([]);
  const [serverHealth, setServerHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // App Navigation & View Modes
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'explorer'
  const [activeLibrary, setActiveLibrary] = useState(null);
  const [displayMode, setDisplayMode] = useState(() => {
    return localStorage.getItem('sv_display_mode') || 'grid';
  });

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Player State
  const [currentVideo, setCurrentVideo] = useState(null);
  const [activeSeriesModal, setActiveSeriesModal] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showAddLibraryModal, setShowAddLibraryModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [watchHistory, setWatchHistory] = useState([]);

  const handleDisplayModeChange = (mode) => {
    setDisplayMode(mode);
    localStorage.setItem('sv_display_mode', mode);
  };

  // Close open modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowStatsModal(false);
        setShowShortcutsModal(false);
        setShowAddLibraryModal(false);
        setShowChangePasswordModal(false);
        setActiveSeriesModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      setWatchHistory(getWatchHistory());
    } catch (err) {
      console.error('Failed to load StreamVault data:', err);
      setError(err.message || 'Failed to load data from server');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  // Periodic health check
  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setInterval(() => {
      fetchServerHealth()
        .then((res) => setServerHealth(res))
        .catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, [isAuthenticated]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await triggerMediaScan();
      await loadData(true);
    } catch {
      setIsRefreshing(false);
    }
  };

  const handleDeleteLibrary = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Remove this library from StreamVault? (Physical media files on disk will NOT be deleted)')) {
      return;
    }
    try {
      await removeLibrary(id);
      setLibraries((prev) => prev.filter((l) => l.id !== id));
      if (activeLibrary?.id === id) {
        setActiveLibrary(null);
      }
    } catch (err) {
      alert(err.message || 'Failed to remove library');
    }
  };

  // Episode navigation helpers
  const getEpisodeNavigation = () => {
    if (!currentVideo) return { next: null, prev: null, episodes: [] };

    const foundSeries = libraryData.series.find((s) =>
      s.episodes.some((ep) => ep.id === currentVideo.id)
    );

    if (foundSeries) {
      const idx = foundSeries.episodes.findIndex((ep) => ep.id === currentVideo.id);
      return {
        next: idx >= 0 && idx < foundSeries.episodes.length - 1 ? foundSeries.episodes[idx + 1] : null,
        prev: idx > 0 ? foundSeries.episodes[idx - 1] : null,
        episodes: foundSeries.episodes,
      };
    }

    return { next: null, prev: null, episodes: [] };
  };

  const nav = getEpisodeNavigation();

  // Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-vault-950 flex flex-col items-center justify-center text-center p-4">
        <Loader2 className="w-10 h-10 text-vault-accent animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-300">Checking StreamVault session...</p>
      </div>
    );
  }

  // If Not Authenticated, show Komga/Jellyfin-style Login Page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Fullscreen video player view
  if (currentVideo) {
    return (
      <VideoPlayer
        mediaItem={currentVideo}
        onBack={() => {
          setCurrentVideo(null);
          setWatchHistory(getWatchHistory());
        }}
        onNextEpisode={() => nav.next && setCurrentVideo(nav.next)}
        onPrevEpisode={() => nav.prev && setCurrentVideo(nav.prev)}
        hasNextEpisode={Boolean(nav.next)}
        hasPrevEpisode={Boolean(nav.prev)}
        seriesEpisodes={nav.episodes}
        onSelectEpisode={(ep) => setCurrentVideo(ep)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-vault-950 text-slate-100 flex flex-col antialiased selection:bg-vault-accent selection:text-white">
      {/* Top Sticky Navbar */}
      <Navbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddLibrary={() => setShowAddLibraryModal(true)}
        serverHealth={serverHealth}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onOpenStats={() => setShowStatsModal(true)}
        onOpenChangePassword={() => setShowChangePasswordModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <Loader2 className="w-12 h-12 text-vault-accent animate-spin mb-4" />
            <p className="text-sm font-semibold text-slate-300">Connecting to origin range server...</p>
            <p className="text-xs text-slate-500 mt-1">Zero Transcode Architecture &bull; CPU 0%</p>
          </div>
        )}

        {/* Error Alert */}
        {error && !loading && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/25 rounded-2xl text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">{error}</div>
            <button
              onClick={() => loadData(true)}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-xs font-semibold"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ================= TAB 1: CATALOG VIEW ================= */}
        {!loading && !error && activeTab === 'catalog' && (
          <>
            {/* Continue Watching Section */}
            {watchHistory.length > 0 && !searchQuery && selectedCategory === 'all' && (
              <ContinueWatching
                historyItems={watchHistory}
                onPlayMedia={(item) => setCurrentVideo(item)}
                onClearHistory={() => setWatchHistory([])}
              />
            )}

            {/* Media Grid with Multi-Mode Explorer (Grid / Compact / Details) */}
            <MediaGrid
              items={libraryData.items}
              series={libraryData.series}
              selectedCategory={selectedCategory}
              searchQuery={searchQuery}
              displayMode={displayMode}
              onDisplayModeChange={handleDisplayModeChange}
              onPlayMedia={(item) => setCurrentVideo(item)}
              onViewSeries={(series) => setActiveSeriesModal(series)}
            />
          </>
        )}

        {/* ================= TAB 2: FOLDER EXPLORER VIEW ================= */}
        {!loading && !error && activeTab === 'explorer' && (
          <div>
            {!activeLibrary ? (
              /* Library Selection Overview */
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-vault-800">
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      <FolderTree className="w-5 h-5 text-amber-400" />
                      <span>Select Homelab Library</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Browse directories and files like Jellyfin & Windows Explorer
                    </p>
                  </div>

                  <button
                    onClick={() => setShowAddLibraryModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-vault-accent hover:bg-vault-accent-hover text-white rounded-xl text-xs font-bold shadow-lg shadow-vault-accent/20 transition"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>Add New Library</span>
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
                        onClick={() => setActiveLibrary(lib)}
                        className="group relative flex flex-col p-5 bg-vault-900/90 hover:bg-vault-850 border border-vault-800 hover:border-vault-accent/60 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] shadow-lg"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 rounded-xl bg-vault-800/80 border border-vault-700 flex items-center justify-center text-vault-accent group-hover:scale-110 transition-transform">
                            {isAnime ? (
                              <Sparkles className="w-6 h-6 text-amber-400" />
                            ) : isMovie ? (
                              <Film className="w-6 h-6 text-rose-400" />
                            ) : isTv ? (
                              <Tv className="w-6 h-6 text-cyan-400" />
                            ) : (
                              <HardDrive className="w-6 h-6 text-vault-accent" />
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-vault-950 text-slate-400 border border-vault-800">
                              {lib.type}
                            </span>
                            {!['anime', 'movies', 'tv', 'default'].includes(lib.id) && (
                              <button
                                onClick={(e) => handleDeleteLibrary(lib.id, e)}
                                className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-vault-950 transition"
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

                        <p className="text-xs font-mono text-slate-400 bg-vault-950 px-2.5 py-1.5 rounded-lg border border-vault-800/80 truncate mb-4">
                          {lib.path}
                        </p>

                        <div className="mt-auto flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-vault-800/60">
                          <span className="flex items-center gap-1 text-vault-accent font-semibold group-hover:translate-x-1 transition-transform">
                            <span>Open Folder</span>
                            <span>&rarr;</span>
                          </span>
                          <span className="text-[11px] text-slate-500">Zero Transcode</span>
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
                onSelectVideo={(video) => setCurrentVideo(video)}
                onBackToLibraries={() => setActiveLibrary(null)}
              />
            )}
          </div>
        )}
      </main>

      {/* Series Episodes Drawer/Modal */}
      {activeSeriesModal && (
        <SeriesModal
          series={activeSeriesModal}
          isOpen={Boolean(activeSeriesModal)}
          onClose={() => setActiveSeriesModal(null)}
          onPlayEpisode={(ep) => {
            setCurrentVideo(ep);
            setActiveSeriesModal(null);
          }}
        />
      )}

      {/* Add Library Modal */}
      <AddLibraryModal
        isOpen={showAddLibraryModal}
        onClose={() => setShowAddLibraryModal(false)}
        onCreated={(newLib) => {
          setLibraries((prev) => [...prev, newLib]);
          setActiveTab('explorer');
          setActiveLibrary(newLib);
        }}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />

      {/* Architecture & Performance Stats Modal */}
      <StatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        serverHealth={serverHealth}
        mediaStats={libraryData}
      />

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
  );
}
