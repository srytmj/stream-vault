import React, { useState } from 'react';
import {
  Film,
  LayoutGrid,
  List,
  Table,
  ArrowUpDown,
} from 'lucide-react';
import MediaCard from './MediaCard';
import VideoThumbnail from './VideoThumbnail';
import { formatTimeAgo } from '../utils/formatters';

export default function MediaGrid({
  items = [],
  series = [],
  selectedCategory = 'all',
  searchQuery = '',
  displayMode = 'grid', 
  onDisplayModeChange,
  onPlayMedia,
  onViewSeries,
}) {
  const [sortBy, setSortBy] = useState('newest'); 

  const filteredItems = items.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return item.title.toLowerCase().includes(q) || item.filename.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredSeries = series.filter((s) => {
    if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
    if (searchQuery) return s.title.toLowerCase().includes(q);
    return true;
  });

  const sortFunction = (a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'size') return (b.size || 0) - (a.size || 0);
    return new Date(b.modifiedAt || 0) - new Date(a.modifiedAt || 0);
  };

  const sortedItems = [...filteredItems].sort(sortFunction);
  const sortedSeries = [...filteredSeries].sort(sortFunction);
  const totalCount = sortedSeries.length + sortedItems.length;

  return (
    <div className="space-y-10 lg:space-y-14">
      {/* Grid Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-white px-1">
          Catalog Explorer
        </h2>

        {/* View & Sort Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* View Modes */}
          <div className="flex items-center bg-white/5 rounded-full p-1 ring-1 ring-white/10">
            <button
              onClick={() => onDisplayModeChange?.('grid')}
              className={`p-1.5 rounded-full transition-all ${
                displayMode === 'grid' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDisplayModeChange?.('compact')}
              className={`p-1.5 rounded-full transition-all ${
                displayMode === 'compact' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Compact View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDisplayModeChange?.('details')}
              className={`p-1.5 rounded-full transition-all ${
                displayMode === 'details' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Table View"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full ring-1 ring-white/10 text-sm text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer appearance-none pr-2"
            >
              <option value="newest" className="bg-vault-900">Recently Added</option>
              <option value="title" className="bg-vault-900">A-Z</option>
              <option value="size" className="bg-vault-900">Size</option>
            </select>
          </div>
        </div>
      </div>

      {displayMode === 'details' ? (
        <div className="bg-vault-900/40 rounded-xl overflow-hidden ring-1 ring-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-6">Media</th>
                  <th className="py-4 px-4">Size</th>
                  <th className="py-4 px-4">Added</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onPlayMedia(item)}
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-6 flex items-center gap-4">
                      <div className="w-24 aspect-video rounded-md overflow-hidden bg-vault-850 shrink-0">
                        <VideoThumbnail
                          streamUrl={item.streamUrl}
                          posterUrl={item.posterUrl}
                          alt={item.title}
                          aspectRatio="aspect-video"
                          showPlayIcon={false}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-200 group-hover:text-white transition-colors truncate">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                          {item.filename}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-xs">
                      {item.sizeFormatted}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">
                      {formatTimeAgo(item.modifiedAt)}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayMedia(item);
                        }}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium transition-colors text-xs"
                      >
                        Play
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Series Section */}
          {sortedSeries.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg md:text-xl font-bold text-white px-1">
                TV Series & Anime
              </h3>
              <div
                className={`grid gap-4 md:gap-6 ${
                  displayMode === 'compact'
                    ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8'
                    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
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
            <div className="space-y-4">
              <h3 className="text-lg md:text-xl font-bold text-white px-1">
                Movies & Single Videos
              </h3>
              <div
                className={`grid gap-4 md:gap-6 ${
                  displayMode === 'compact'
                    ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8'
                    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
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
        <div className="py-32 flex flex-col items-center justify-center text-center px-4">
          <Film className="w-16 h-16 text-white/20 mb-4" />
          <h3 className="text-xl font-bold text-slate-300">No media found</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-sm">
            {searchQuery
              ? `No results found for "${searchQuery}". Try a different keyword.`
              : 'Media storage is empty or contains no supported format.'}
          </p>
        </div>
      )}
    </div>
  );
}
