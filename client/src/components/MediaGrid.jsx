import React, { useState } from 'react';
import {
  Film,
  Sparkles,
  Tv,
  LayoutGrid,
  List,
  Table,
  SlidersHorizontal,
  ArrowUpDown,
  Search,
  Subtitles,
  FileVideo,
  Play,
} from 'lucide-react';
import MediaCard from './MediaCard';
import VideoThumbnail from './VideoThumbnail';
import { formatTimeAgo } from '../utils/formatters';

export default function MediaGrid({
  items = [],
  series = [],
  selectedCategory = 'all',
  searchQuery = '',
  displayMode = 'grid', // 'grid' | 'compact' | 'details'
  onDisplayModeChange,
  onPlayMedia,
  onViewSeries,
}) {
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'title' | 'size'

  // Filter items by category
  const filteredItems = items.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.filename.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filter series by category
  const filteredSeries = series.filter((s) => {
    if (selectedCategory !== 'all' && s.category !== selectedCategory) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return s.title.toLowerCase().includes(q);
    }
    return true;
  });

  // Sort logic
  const sortFunction = (a, b) => {
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'size') {
      return (b.size || 0) - (a.size || 0);
    }
    // Default: newest
    return new Date(b.modifiedAt || 0) - new Date(a.modifiedAt || 0);
  };

  const sortedItems = [...filteredItems].sort(sortFunction);
  const sortedSeries = [...filteredSeries].sort(sortFunction);

  const totalCount = sortedSeries.length + sortedItems.length;

  return (
    <div className="space-y-6">
      {/* Grid Header & Explorer View Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-vault-800">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Koleksi Media</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-vault-850 text-vault-accent border border-vault-700">
              {totalCount} item
            </span>
          </h2>
        </div>

        {/* View Mode Switcher (Grid, Compact, Details Table) */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-vault-900 p-1 rounded-xl border border-vault-800 text-xs">
            <button
              onClick={() => onDisplayModeChange?.('grid')}
              className={`p-1.5 rounded-lg transition ${
                displayMode === 'grid'
                  ? 'bg-vault-800 text-white shadow'
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
                  ? 'bg-vault-800 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Compact Icons (Sedang)"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDisplayModeChange?.('details')}
              className={`p-1.5 rounded-lg transition ${
                displayMode === 'details'
                  ? 'bg-vault-800 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Details View (Tabel File Explorer)"
            >
              <Table className="w-4 h-4" />
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
                  <th className="py-3 px-4">Thumbnail</th>
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
                      <td className="py-2.5 px-4 w-20">
                        <div className="w-16 aspect-video rounded-md overflow-hidden">
                          <VideoThumbnail
                            streamUrl={item.streamUrl}
                            posterUrl={item.posterUrl}
                            alt={item.title}
                            aspectRatio="aspect-video"
                            showPlayIcon={false}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200 group-hover:text-vault-accent transition truncate max-w-[280px]">
                          {item.title}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 truncate max-w-[280px]">
                          {item.filename}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-vault-950 border border-vault-800 rounded font-mono text-[10px] text-vault-accent font-bold uppercase">
                          {item.extension?.replace('.', '')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {item.sizeFormatted}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 bg-vault-850 rounded-full text-[10px] font-bold text-slate-300 uppercase">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {hasAss ? (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded text-[10px] font-bold">
                            ASS STYLED
                          </span>
                        ) : item.subtitles?.length > 0 ? (
                          <span className="px-2 py-0.5 bg-vault-800 text-slate-300 rounded text-[10px]">
                            {item.subtitles.length} Sub
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {formatTimeAgo(item.modifiedAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayMedia(item);
                          }}
                          className="px-3 py-1.5 bg-vault-accent hover:bg-vault-accent-hover text-white rounded-lg font-bold transition shadow-sm"
                        >
                          Putar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid & Compact Views */
        <div className="space-y-8">
          {/* Series Section */}
          {sortedSeries.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span>TV Series & Anime Berkala</span>
                <span className="text-xs text-slate-600">({sortedSeries.length})</span>
              </h3>

              <div
                className={`grid gap-4 ${
                  displayMode === 'compact'
                    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
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
            </div>
          )}

          {/* Standalone Movies & Videos Section */}
          {sortedItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span>Video & Film Tunggal</span>
                <span className="text-xs text-slate-600">({sortedItems.length})</span>
              </h3>

              <div
                className={`grid gap-4 ${
                  displayMode === 'compact'
                    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
                    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
                }`}
              >
                {sortedItems.map((item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    compact={displayMode === 'compact'}
                    onPlay={onPlayMedia}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {totalCount === 0 && (
        <div className="py-20 text-center bg-vault-900/50 border border-vault-800/80 rounded-2xl">
          <Film className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-200">Tidak ada media ditemukan</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `Tidak ada hasil untuk pencarian "${searchQuery}". Coba kata kunci lain.`
              : 'Folder media kosong atau belum ada file video yang didukung (.mp4, .mkv, .webm).'}
          </p>
        </div>
      )}
    </div>
  );
}
