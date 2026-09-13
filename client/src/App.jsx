import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import VideoPlayer from './components/VideoPlayer';
import ContinueWatching from './components/ContinueWatching';
import MediaGrid from './components/MediaGrid';
import SeriesModal from './components/SeriesModal';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import StatsModal from './components/StatsModal';
import { fetchMediaLibrary, triggerMediaScan, fetchServerHealth } from './utils/api';
import { getWatchHistory, removeWatchHistory } from './utils/storage';
import { Zap, AlertTriangle } from 'lucide-react';

export default function App() {
  const [mediaData, setMediaData] = useState({ items: [], series: [], categories: [] });
  const [serverHealth, setServerHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Active modal / player states
  const [nowPlaying, setNowPlaying] = useState(null);
  const [seriesModalItem, setSeriesModalItem] = useState(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  // Watch history
  const [historyItems, setHistoryItems] = useState([]);

  // Load history from localStorage
  const reloadHistory = useCallback(() => {
    const hist = getWatchHistory();
    const sorted = Object.values(hist)
      .filter((h) => !h.completed && h.currentTime > 5)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 8);
    setHistoryItems(sorted);
  }, []);

  // Fetch initial library data
  const loadLibrary = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setIsRefreshing(true);
      setError(null);

      const [library, health] = await Promise.all([
        fetchMediaLibrary(isManualRefresh),
        fetchServerHealth(),
      ]);

      setMediaData(library);
      setServerHealth(health);
      reloadHistory();
    } catch (err) {
      console.error('Error loading StreamVault library:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [reloadHistory]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  // Handle manual rescan
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await triggerMediaScan();
      await loadLibrary(true);
    } catch (err) {
      console.error('Failed to trigger media scan:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Episode navigation within a series or list
  const currentSeries = nowPlaying?.showName
    ? mediaData.series.find(
        (s) => s.title.toLowerCase() === nowPlaying.showName.toLowerCase()
      )
    : null;

  const currentEpisodeList = currentSeries ? currentSeries.episodes : mediaData.items;
  const currentIndex = nowPlaying
    ? currentEpisodeList.findIndex((ep) => ep.id === nowPlaying.id)
    : -1;

  const hasNextEpisode = currentIndex >= 0 && currentIndex < currentEpisodeList.length - 1;
  const hasPrevEpisode = currentIndex > 0;

  const handleNextEpisode = () => {
    if (hasNextEpisode) {
      setNowPlaying(currentEpisodeList[currentIndex + 1]);
    }
  };

  const handlePrevEpisode = () => {
    if (hasPrevEpisode) {
      setNowPlaying(currentEpisodeList[currentIndex - 1]);
    }
  };

  // Play item handler
  const handlePlayMedia = (item) => {
    setNowPlaying(item);
    setSeriesModalItem(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Remove history item
  const handleRemoveHistory = (id) => {
    removeWatchHistory(id);
    reloadHistory();
  };

  return (
    <div className="min-h-screen bg-vault-950 text-slate-100 flex flex-col font-sans selection:bg-vault-accent selection:text-white">
      {/* Top Navigation */}
      <Navbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        serverHealth={serverHealth}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onOpenStats={() => setShowStatsModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {nowPlaying ? (
          /* Active Full Player View */
          <VideoPlayer
            mediaItem={nowPlaying}
            onBack={() => {
              setNowPlaying(null);
              reloadHistory();
            }}
            onNextEpisode={handleNextEpisode}
            onPrevEpisode={handlePrevEpisode}
            hasNextEpisode={hasNextEpisode}
            hasPrevEpisode={hasPrevEpisode}
            seriesEpisodes={currentEpisodeList}
            onSelectEpisode={(ep) => setNowPlaying(ep)}
          />
        ) : (
          /* Library Browser View */
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
            {/* Error banner if server unreachable */}
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Connection Notice: {error}</span>
                </div>
                <button
                  onClick={() => loadLibrary()}
                  className="px-3 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded-lg font-semibold"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Zero-Transcode Hero Pill Banner */}
            <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-vault-900 via-vault-850 to-vault-900 border border-vault-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-black/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-vault-accent/15 border border-vault-accent/30 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-vault-accent" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                    Zero Server Transcoding &bull; 100% Client-Side Playback
                  </h2>
                  <p className="text-xs text-slate-400">
                    Byte-range origin delivery &bull; Hardware GPU decoding &bull; Stylized ASS subtitles rendered via WebAssembly canvas
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="px-3 py-1.5 rounded-xl bg-vault-950 border border-vault-800 text-slate-300 font-mono">
                  <span className="text-emerald-400 font-bold">0%</span> CPU Spikes
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-vault-950 border border-vault-800 text-slate-300 font-mono">
                  <span className="text-cyan-400 font-bold">RFC 7233</span> 206 Partial
                </div>
              </div>
            </div>

            {/* Continue Watching Section */}
            {!searchQuery && historyItems.length > 0 && (
              <ContinueWatching
                historyItems={historyItems}
                onResume={(item) => {
                  // Find full item from mediaData
                  const fullItem = mediaData.items.find((m) => m.id === item.id) || item;
                  handlePlayMedia(fullItem);
                }}
                onRemove={handleRemoveHistory}
              />
            )}

            {/* Media Grid Section */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-vault-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium text-slate-400">Scanning media library...</span>
              </div>
            ) : (
              <MediaGrid
                items={mediaData.items}
                series={mediaData.series}
                selectedCategory={selectedCategory}
                searchQuery={searchQuery}
                onPlayMedia={handlePlayMedia}
                onViewSeries={(series) => setSeriesModalItem(series)}
              />
            )}
          </div>
        )}
      </main>

      {/* Series Detail Modal */}
      {seriesModalItem && (
        <SeriesModal
          series={seriesModalItem}
          onClose={() => setSeriesModalItem(null)}
          onPlayEpisode={handlePlayMedia}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <KeyboardShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}

      {/* Stats & Architecture Modal */}
      {showStatsModal && (
        <StatsModal
          serverHealth={serverHealth}
          mediaStats={{
            totalFiles: mediaData.items.length,
            totalSeries: mediaData.series.length,
          }}
          onClose={() => setShowStatsModal(false)}
        />
      )}
    </div>
  );
}
