import React, { useState } from 'react';
import {
  Sparkles,
  Film,
  Tv,
  LayoutGrid,
  Grid2X2,
  List,
  ArrowUpDown,
  FolderOpen,
  Play,
  FileVideo,
  HardDrive,
  Calendar,
  Subtitles,
} from 'lucide-react';
import MediaCard from './MediaCard';
import { formatTimeAgo } from '../utils/formatters';

export default function MediaGrid({
  items = [],
  series = [],
  selectedCategory = 'all',
  searchQuery = '',
  displayMode = 'grid', // 'grid', 'compact', 'details'
  onDisplayModeChange,
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
      {/* Controls Bar: View Mode, Display Switcher & Sorting */}
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

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Toggle Series vs Flat Files */}
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
                Series
              </button>
              <button
                onClick={() => setViewMode('files')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  viewMode === 'files'
                    ? 'bg-vault-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua File
              </button>
            </div>
          )}

          {/* Explorer Display Mode Switcher (Grid / Compact / Details Table) */}
          <div className="flex items-center bg-vault-900 p-1 rounded-xl border border-vault-800 text-xs">
            <button
              onClick={() => onDisplayModeChange?.('grid')}
              className={`p-1.5 rounded-lg transition ${
                displayMode === 'grid'
                  ? 'bg-vault-800 text-vault-accent shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Poster Grid (Besar)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDisplayModeChange?.('compact')}
              className={`p-1.5 rounded-lg transition ${
                displayMode === 'compact'
                  ? 'bg-vault-800 text-vault-accent shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Compact Icons (Sedang)"
            >
              <Grid2X2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDisplayModeChange?.('details')}
              className={`p-1.5 rounded-lg transition ${
                displayMode === 'details'
                  ? 'bg-vault-800 text-vault-accent shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Details View (Tabel File Explorer)"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-vault-900 px-2.5 py-1 rounded-xl border border-vault-800 text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-slate-300 focus:outline-none cursor-pointer pr-1"
            >
              <option value="newest" className="bg-vault-900">Terbaru</option>
              <option value="title" className="bg-vault-900">Nama A-Z</option>
              <option value="size" className="bg-vault-900">Ukuran File</option>
            </select>
          </div>
        </div>
      </div>

      {/* Details View (File Explorer Table) */}
      {displayMode === 'details' ? (
        <div className="bg-vault-900/80 border border-vault-800/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-vault-950/80 text-slate-400 border-b border-vault-800 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Nama File / Judul</th>
                  <th className="py-3 px-3">Format</th>
                  <th className="py-3 px-3">Ukuran</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-3">Subtitle</th>
                  <th className="py-3 px-3">Diperbarui</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vault-800/60">
                {sortedItems.map((item) => {
                  const hasAss = item.subtitles?.some((s) => s.format === 'ass' || s.format === 'ssa');
                  return (
                    <tr
                      key={item.id}
                      onClick={() => onPlayMedia(item)}
                      className="hover:bg-vault-850/60 transition cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-10 rounded bg-vault-950 flex items-center justify-center flex-shrink-0 overflow-hidden border border-vault-800">
                            {item.posterUrl ? (
                              <img src={item.posterUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <FileVideo className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-200 group-hover:text-vault-accent transition truncate max-w-[280px]">
                              {item.title}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 truncate max-w-[280px]">
                              {item.filename}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-vault-950 border border-vault-800 rounded font-mono text-[10px] text-vault-accent font-bold uppercase">
                          {item.extension.replace('.', '')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {item.sizeFormatted}
                      </td>
                      <td className="py-3 px-3">
                        <span className="capitalize text-slate-400">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {hasAss && (
                            <span className="px-1.5 py-0.5 bg-purple-500/15 border border-purple-500/30 text-purple-400 rounded text-[9px] font-bold">
                              ASS
                            </span>
                          )}
                          {item.subtitles?.length > 0 ? (
                            <span className="text-emerald-400 font-medium text-[11px]">
                              {item.subtitles.length} track
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {formatTimeAgo(item.modifiedAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayMedia(item);
                          }}
                          className="p-1.5 bg-vault-accent/15 hover:bg-vault-accent text-vault-accent hover:text-white rounded-lg transition"
                          title="Putar Sekarang"
                        >
                          <Play className="w-4 h-4 fill-current" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : showSeriesGrid ? (
        /* Series Grid (Large or Compact) */
        <div
          className={`grid gap-4 ${
            displayMode === 'compact'
              ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
          }`}
        >
          {sortedSeries.map((s) => (
            <MediaCard
              key={s.id}
              item={s}
              isSeries={true}
              compact={displayMode === 'compact'}
              onViewSeries={onViewSeries}
            />
          ))}
        </div>
      ) : sortedItems.length > 0 ? (
        /* Flat Files Grid (Large or Compact) */
        <div
          className={`grid gap-4 ${
            displayMode === 'compact'
              ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
          }`}
        >
          {sortedItems.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              isSeries={false}
              compact={displayMode === 'compact'}
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
          <h3 className="text-base font-bold text-white mb-1">Belum Ada Media</h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            StreamVault menunggu file media dari direktori server Anda:
          </p>
          <div className="text-left bg-vault-950 p-4 rounded-xl border border-vault-800 font-mono text-xs text-slate-300 space-y-1.5 mb-4">
            <div><span className="text-vault-accent">/media/anime/</span> &bull; Serial & episode anime (.mkv, .mp4, .ass)</div>
            <div><span className="text-vault-accent">/media/movies/</span> &bull; Film & movie</div>
            <div><span className="text-vault-accent">/media/tv/</span> &bull; TV series & season</div>
          </div>
        </div>
      )}
    </div>
  );
}
