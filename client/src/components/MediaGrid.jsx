import React, { useState } from 'react';
import { Sparkles, Film, Tv, LayoutGrid, ListFilter, ArrowUpDown, FolderOpen } from 'lucide-react';
import MediaCard from './MediaCard';

export default function MediaGrid({
  items = [],
  series = [],
  selectedCategory = 'all',
  searchQuery = '',
  onPlayMedia,
  onViewSeries,
}) {
  const [viewMode, setViewMode] = useState('series'); // 'series' or 'files'
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'title', 'size'

  // Filter items by category & search
  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    if (!matchesCategory) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.showName && item.showName.toLowerCase().includes(q)) ||
      item.filename.toLowerCase().includes(q)
    );
  });

  // Filter series by category & search
  const filteredSeries = series.filter((s) => {
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    if (!matchesCategory) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.title.toLowerCase().includes(q);
  });

  // Apply sorting
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'size') return b.size - a.size;
    return new Date(b.modifiedAt) - new Date(a.modifiedAt);
  });

  const sortedSeries = [...filteredSeries].sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'size') return b.totalSizeBytes - a.totalSizeBytes;
    return new Date(b.latestModified) - new Date(a.latestModified);
  });

  const isMoviesSelected = selectedCategory === 'movies';
  // If movies is selected or there are no grouped series, display flat items
  const showSeriesGrid = viewMode === 'series' && !isMoviesSelected && sortedSeries.length > 0;

  return (
    <div>
      {/* Controls Bar: View Mode & Sorting */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-vault-800/80">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            {selectedCategory === 'anime' && <Sparkles className="w-5 h-5 text-amber-400" />}
            {selectedCategory === 'movies' && <Film className="w-5 h-5 text-rose-400" />}
            {selectedCategory === 'tv' && <Tv className="w-5 h-5 text-cyan-400" />}
            <span className="capitalize">{selectedCategory} Media</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-vault-850 text-slate-400 border border-vault-700">
              {showSeriesGrid ? sortedSeries.length : sortedItems.length}
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Toggle Series vs Flat Files (hidden if movie selected) */}
          {!isMoviesSelected && sortedSeries.length > 0 && (
            <div className="flex items-center bg-vault-900 p-1 rounded-xl border border-vault-800 text-xs">
              <button
                onClick={() => setViewMode('series')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  viewMode === 'series'
                    ? 'bg-vault-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Series View
              </button>
              <button
                onClick={() => setViewMode('files')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  viewMode === 'files'
                    ? 'bg-vault-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Individual Files
              </button>
            </div>
          )}

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-vault-900 px-2.5 py-1 rounded-xl border border-vault-800 text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-slate-300 focus:outline-none cursor-pointer pr-1"
            >
              <option value="newest" className="bg-vault-900">Newest Added</option>
              <option value="title" className="bg-vault-900">Title A-Z</option>
              <option value="size" className="bg-vault-900">File Size</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      {showSeriesGrid ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {sortedSeries.map((s) => (
            <MediaCard
              key={s.id}
              item={s}
              isSeries={true}
              onViewSeries={onViewSeries}
            />
          ))}
        </div>
      ) : sortedItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {sortedItems.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              isSeries={false}
              onPlay={onPlayMedia}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="py-16 px-4 text-center max-w-lg mx-auto bg-vault-900/40 rounded-3xl border border-vault-800/80 p-8">
          <div className="w-16 h-16 rounded-2xl bg-vault-850 flex items-center justify-center mx-auto mb-4 border border-vault-700 text-slate-400">
            <FolderOpen className="w-8 h-8 text-vault-accent" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No Media Found</h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            StreamVault is waiting for media files. Place your anime, movie, and TV files into:
          </p>
          <div className="text-left bg-vault-950 p-4 rounded-xl border border-vault-800 font-mono text-xs text-slate-300 space-y-1.5 mb-4">
            <div><span className="text-vault-accent">/media/anime/</span> &bull; Anime series & episodes (.mkv, .mp4, .ass)</div>
            <div><span className="text-vault-accent">/media/movies/</span> &bull; Feature movies & films</div>
            <div><span className="text-vault-accent">/media/tv/</span> &bull; TV series & seasons</div>
          </div>
          <p className="text-[11px] text-slate-500">
            Tip: Companion styled subtitles (.ass, .srt) in the same folder are automatically loaded.
          </p>
        </div>
      )}
    </div>
  );
}
