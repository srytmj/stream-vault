import React, { useState } from 'react';
import {
  Film,
  LayoutGrid,
  List,
  Table,
  ArrowUpDown,
  Play,
  Layers,
  Sparkles,
  Tv,
  Subtitles,
  ExternalLink,
} from 'lucide-react';
import MediaCard from './MediaCard';
import VideoThumbnail from './VideoThumbnail';
import { formatTimeAgo, getCategoryBadgeClass } from '../utils/formatters';
import { appendAuthToken } from '../utils/api';

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

  const q = searchQuery ? searchQuery.toLowerCase().trim() : '';

  // Standalone items only (exclude individual episodes of series)
  const standaloneItems = items.filter((item) => !item.isEpisode && !item.seriesId);

  const filteredItems = standaloneItems.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (q) {
      return (
        item.title.toLowerCase().includes(q) ||
        (item.filename && item.filename.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const filteredSeries = series.filter((s) => {
    if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
    if (q) {
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchEpisodes = s.episodes?.some(
        (ep) => ep.title.toLowerCase().includes(q) || ep.filename.toLowerCase().includes(q)
      );
      return matchTitle || matchEpisodes;
    }
    return true;
  });

  const sortFunction = (a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'size') {
      const sizeA = a.totalSizeBytes || a.size || 0;
      const sizeB = b.totalSizeBytes || b.size || 0;
      return sizeB - sizeA;
    }
    const dateA = new Date(a.latestModified || a.modifiedAt || 0).getTime();
    const dateB = new Date(b.latestModified || b.modifiedAt || 0).getTime();
    return dateB - dateA;
  };

  const sortedItems = [...filteredItems].sort(sortFunction);
  const sortedSeries = [...filteredSeries].sort(sortFunction);
  const totalCount = sortedSeries.length + sortedItems.length;

  // Unified items for Table View
  const unifiedTableItems = [
    ...sortedSeries.map((s) => ({ ...s, isSeries: true })),
    ...sortedItems.map((i) => ({ ...i, isSeries: false })),
  ].sort(sortFunction);

  return (
    <div className="space-y-8">
      {/* View & Sort Controls Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Catalog Explorer
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {totalCount} {totalCount === 1 ? 'collection' : 'collections and media items'} available
          </p>
        </div>

        {/* View & Sort Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* View Modes Switcher */}
          <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
            <button
              onClick={() => onDisplayModeChange?.('grid')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                displayMode === 'grid'
                  ? 'bg-vault-accent text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Grid View (Poster Cards)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => onDisplayModeChange?.('compact')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                displayMode === 'compact'
                  ? 'bg-vault-accent text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Compact View (Dense List)"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Compact List</span>
            </button>
            <button
              onClick={() => onDisplayModeChange?.('details')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                displayMode === 'details'
                  ? 'bg-vault-accent text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Table View (Data Details)"
            >
              <Table className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer appearance-none pr-2 text-xs"
            >
              <option value="newest" className="bg-vault-900 text-white">Recently Added</option>
              <option value="title" className="bg-vault-900 text-white">A-Z</option>
              <option value="size" className="bg-vault-900 text-white">Size</option>
            </select>
          </div>
        </div>
      </div>

      {/* ================= MODE 1: GRID VIEW (Cards) ================= */}
      {displayMode === 'grid' && (
        <div className="space-y-12">
          {/* Series Section */}
          {sortedSeries.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg md:text-xl font-bold text-white px-1 flex items-center gap-2">
                  <Tv className="w-5 h-5 text-vault-accent" />
                  <span>TV Series & Anime</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                    {sortedSeries.length}
                  </span>
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {sortedSeries.map((s) => (
                  <MediaCard
                    key={s.id}
                    item={s}
                    isSeries={true}
                    onViewSeries={onViewSeries}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Standalone Movies & Videos Section */}
          {sortedItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg md:text-xl font-bold text-white px-1 flex items-center gap-2">
                  <Film className="w-5 h-5 text-rose-400" />
                  <span>Movies & Standalone Videos</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                    {sortedItems.length}
                  </span>
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {sortedItems.map((item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    isSeries={false}
                    onPlay={onPlayMedia}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= MODE 2: COMPACT LIST VIEW ================= */}
      {displayMode === 'compact' && (
        <div className="space-y-8">
          {/* Series Compact Section */}
          {sortedSeries.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 px-1">
                <Tv className="w-4 h-4 text-vault-accent" />
                <span>TV Series & Anime ({sortedSeries.length})</span>
              </h3>
              <div className="space-y-2">
                {sortedSeries.map((s) => {
                  const hasAss = s.episodes?.some((ep) =>
                    ep.subtitles?.some((sub) => sub.format === 'ass' || sub.format === 'ssa')
                  );

                  return (
                    <div
                      key={s.id}
                      onClick={() => onViewSeries(s)}
                      className="group flex items-center justify-between p-3 bg-vault-900/80 hover:bg-vault-850 border border-white/10 hover:border-vault-accent/50 rounded-xl cursor-pointer transition shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Compact Poster */}
                        <div className="w-14 h-20 sm:w-16 sm:h-24 rounded-lg overflow-hidden bg-vault-950 border border-white/10 shrink-0 relative">
                          {s.posterUrl ? (
                            <img
                              src={appendAuthToken(s.posterUrl)}
                              alt={s.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-vault-950 text-slate-600">
                              <Layers className="w-6 h-6" />
                            </div>
                          )}
                        </div>

                        {/* Series Details */}
                        <div className="min-w-0">
                          <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-vault-accent transition truncate mb-1">
                            {s.title}
                          </h4>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadgeClass(
                                s.category
                              )}`}
                            >
                              {s.category}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-vault-accent/20 text-vault-accent border border-vault-accent/30 flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              {s.totalEpisodes} Episodes
                            </span>
                            <span className="font-mono text-slate-400">{s.totalSizeFormatted}</span>
                            <span>&bull;</span>
                            <span>{formatTimeAgo(s.latestModified)}</span>
                            {hasAss && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                ASS Styled Subs
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Action */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewSeries(s);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-vault-accent/20 hover:bg-vault-accent text-vault-accent hover:text-white rounded-xl text-xs font-semibold transition shrink-0 ml-3 shadow-sm"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Episodes</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Standalone Movies Compact Section */}
          {sortedItems.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 px-1">
                <Film className="w-4 h-4 text-rose-400" />
                <span>Movies & Single Videos ({sortedItems.length})</span>
              </h3>
              <div className="space-y-2">
                {sortedItems.map((item) => {
                  const hasAss = item.subtitles?.some(
                    (s) => s.format === 'ass' || s.format === 'ssa'
                  );

                  return (
                    <div
                      key={item.id}
                      onClick={() => onPlayMedia(item)}
                      className="group flex items-center justify-between p-3 bg-vault-900/80 hover:bg-vault-850 border border-white/10 hover:border-vault-accent/50 rounded-xl cursor-pointer transition shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Compact Video Thumbnail */}
                        <div className="w-24 sm:w-28 aspect-video rounded-lg overflow-hidden bg-vault-950 border border-white/10 shrink-0 relative">
                          <VideoThumbnail
                            streamUrl={item.streamUrl}
                            posterUrl={item.posterUrl}
                            thumbnailUrl={item.thumbnailUrl}
                            alt={item.title}
                            aspectRatio="aspect-video"
                            showPlayIcon={false}
                          />
                        </div>

                        {/* Video Details */}
                        <div className="min-w-0">
                          <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-vault-accent transition truncate mb-1">
                            {item.title}
                          </h4>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadgeClass(
                                item.category
                              )}`}
                            >
                              {item.category}
                            </span>
                            <span className="font-mono text-xs text-slate-300 uppercase bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                              {item.extension.replace('.', '')}
                            </span>
                            <span className="font-mono text-slate-400">{item.sizeFormatted}</span>
                            <span>&bull;</span>
                            <span>{formatTimeAgo(item.modifiedAt)}</span>
                            {hasAss && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                ASS Subs
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Action */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlayMedia(item);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-vault-accent hover:bg-vault-accent-hover text-white rounded-xl text-xs font-semibold transition shrink-0 ml-3 shadow-sm shadow-vault-accent/30"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Play</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= MODE 3: TABLE VIEW ================= */}
      {displayMode === 'details' && (
        <div className="bg-vault-900/60 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-white/5 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-5">Media Title</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Content Info</th>
                  <th className="py-3.5 px-4">Format / Subs</th>
                  <th className="py-3.5 px-4">Size</th>
                  <th className="py-3.5 px-4">Date Added</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {unifiedTableItems.map((item) => {
                  const isSeries = Boolean(item.isSeries);
                  const hasAss = isSeries
                    ? item.episodes?.some((ep) =>
                        ep.subtitles?.some((sub) => sub.format === 'ass' || sub.format === 'ssa')
                      )
                    : item.subtitles?.some((sub) => sub.format === 'ass' || sub.format === 'ssa');

                  return (
                    <tr
                      key={item.id}
                      onClick={() => (isSeries ? onViewSeries(item) : onPlayMedia(item))}
                      className="hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      {/* Media Title & Preview */}
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-10 rounded-lg overflow-hidden bg-vault-950 border border-white/10 shrink-0 relative flex items-center justify-center">
                            {item.posterUrl ? (
                              <img
                                src={appendAuthToken(item.posterUrl)}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : !isSeries && (item.thumbnailUrl || item.streamUrl) ? (
                              <VideoThumbnail
                                streamUrl={item.streamUrl}
                                posterUrl={null}
                                thumbnailUrl={item.thumbnailUrl}
                                alt={item.title}
                                aspectRatio="aspect-video"
                                showPlayIcon={false}
                              />
                            ) : (
                              <Layers className="w-5 h-5 text-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-white group-hover:text-vault-accent transition-colors truncate max-w-xs md:max-w-md">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono truncate max-w-xs">
                              {isSeries ? `${item.folderName || item.title}` : item.filename}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadgeClass(
                            item.category
                          )}`}
                        >
                          {isSeries ? `${item.category} Series` : item.category}
                        </span>
                      </td>

                      {/* Content Info */}
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-300">
                        {isSeries ? (
                          <span className="font-semibold text-vault-accent flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5" />
                            {item.totalEpisodes} Episodes
                          </span>
                        ) : (
                          <span className="text-slate-400">Single Video</span>
                        )}
                      </td>

                      {/* Format / Subs */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {!isSeries && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 border border-white/10 text-slate-300 uppercase">
                              {item.extension?.replace('.', '')}
                            </span>
                          )}
                          {hasAss && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              ASS
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Size */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-xs text-slate-300">
                        {isSeries ? item.totalSizeFormatted : item.sizeFormatted}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-400">
                        {formatTimeAgo(item.latestModified || item.modifiedAt)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-5 whitespace-nowrap text-right">
                        {isSeries ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewSeries(item);
                            }}
                            className="px-3 py-1 bg-vault-accent/20 hover:bg-vault-accent text-vault-accent hover:text-white rounded-lg font-semibold transition text-xs inline-flex items-center gap-1"
                          >
                            <Layers className="w-3 h-3" />
                            <span>Episodes</span>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlayMedia(item);
                            }}
                            className="px-3 py-1 bg-vault-accent hover:bg-vault-accent-hover text-white rounded-lg font-semibold transition text-xs inline-flex items-center gap-1 shadow-sm shadow-vault-accent/20"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Play</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
