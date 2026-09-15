import React, { useRef } from 'react';
import {
  Sparkles,
  Film,
  Tv,
  Folder,
  FolderTree,
  ChevronRight,
  ChevronLeft,
  Play,
  Layers,
  Plus,
  Compass,
} from 'lucide-react';
import ContinueWatching from './ContinueWatching';
import { appendAuthToken } from '../utils/api';
import VideoThumbnail from './VideoThumbnail';

// Category style & icon helper
function getLibraryStyle(type = '', name = '') {
  const lowerType = type.toLowerCase();
  const lowerName = name.toLowerCase();

  if (lowerType === 'anime' || lowerName.includes('anime')) {
    return {
      icon: Sparkles,
      gradient: 'from-violet-600/30 via-indigo-900/40 to-slate-900/90',
      borderHover: 'group-hover:border-violet-500/60',
      iconColor: 'text-violet-400',
      accentColor: '#8b5cf6',
      badgeBg: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    };
  }

  if (lowerType === 'movies' || lowerName.includes('movie') || lowerName.includes('film')) {
    return {
      icon: Film,
      gradient: 'from-sky-600/30 via-blue-900/40 to-slate-900/90',
      borderHover: 'group-hover:border-sky-500/60',
      iconColor: 'text-sky-400',
      accentColor: '#0ea5e9',
      badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    };
  }

  if (lowerType === 'tv' || lowerName.includes('tv') || lowerName.includes('series') || lowerName.includes('show')) {
    return {
      icon: Tv,
      gradient: 'from-amber-600/30 via-orange-950/40 to-slate-900/90',
      borderHover: 'group-hover:border-amber-500/60',
      iconColor: 'text-amber-400',
      accentColor: '#f59e0b',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    };
  }

  return {
    icon: Folder,
    gradient: 'from-emerald-600/30 via-teal-950/40 to-slate-900/90',
    borderHover: 'group-hover:border-emerald-500/60',
    iconColor: 'text-emerald-400',
    accentColor: '#10b981',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  };
}

// Single Horizontal Scrolling Media Row (Jellyfin Style)
function MediaRow({
  title,
  subtitle,
  icon: IconComponent,
  items = [],
  onPlayMedia,
  onViewSeries,
  onViewAll,
}) {
  const scrollRef = useRef(null);

  if (!items || items.length === 0) return null;

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const offset = direction === 'left' ? -420 : 420;
    scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <section className="mb-10 lg:mb-14 relative group/row">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 lg:mb-5 px-1">
        <div className="flex items-center gap-2.5">
          {IconComponent && <IconComponent className="w-5 h-5 text-vault-accent" />}
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-xs font-semibold text-slate-400 hover:text-vault-accent flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg hover:bg-white/5"
            >
              <span>Browse All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Carousel Scroll Buttons (Desktop) */}
          <div className="hidden md:flex items-center gap-1.5 opacity-70 group-hover/row:opacity-100 transition-opacity">
            <button
              onClick={() => scroll('left')}
              className="p-2 rounded-xl bg-vault-900/80 hover:bg-vault-800 border border-white/10 text-slate-300 hover:text-white transition"
              title="Scroll Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="p-2 rounded-xl bg-vault-900/80 hover:bg-vault-800 border border-white/10 text-slate-300 hover:text-white transition"
              title="Scroll Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Carousel Container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 scroll-smooth snap-x snap-mandatory scrollbar-none -mx-4 px-4 md:mx-0 md:px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item) => {
          const isSeries = Boolean(item.isSeries || item.episodes);
          const hasPoster = Boolean(item.posterUrl);

          return (
            <div
              key={item.id}
              onClick={() => (isSeries ? onViewSeries?.(item) : onPlayMedia?.(item))}
              className="group/card flex-none w-[160px] sm:w-[185px] md:w-[210px] snap-start cursor-pointer text-left select-none transition-all duration-300 transform hover:-translate-y-1.5"
            >
              {/* Poster Box (2:3 Aspect Ratio) */}
              <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-vault-900 border border-white/10 group-hover/card:border-vault-accent/60 shadow-lg group-hover/card:shadow-2xl group-hover/card:shadow-black/70 transition-all duration-300">
                {hasPoster ? (
                  <img
                    src={appendAuthToken(item.posterUrl)}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : !isSeries && (item.thumbnailUrl || item.streamUrl) ? (
                  <VideoThumbnail
                    streamUrl={item.streamUrl}
                    posterUrl={null}
                    thumbnailUrl={item.thumbnailUrl}
                    alt={item.title}
                    aspectRatio="aspect-[2/3]"
                    showPlayIcon={false}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-vault-950 via-vault-900 to-vault-850 flex flex-col items-center justify-center p-4 text-center">
                    <Play className="w-10 h-10 text-slate-600 mb-2" />
                    <span className="text-xs font-bold text-slate-300 line-clamp-2 uppercase tracking-wider">
                      {item.title}
                    </span>
                  </div>
                )}

                {/* Subtle vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                {/* Hover Play Button */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-[1px]">
                  <div className="w-12 h-12 rounded-full bg-vault-accent text-white flex items-center justify-center shadow-lg shadow-vault-accent/40 transform scale-75 group-hover/card:scale-100 transition-transform">
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  </div>
                </div>

                {/* Top Badges */}
                <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 items-end z-10">
                  {isSeries && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-vault-accent text-white shadow-md flex items-center gap-1 backdrop-blur-md">
                      <Layers className="w-3 h-3" />
                      {item.totalEpisodes || item.episodes?.length || 0} EP
                    </span>
                  )}
                  {!isSeries && item.resolution && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono bg-black/75 text-slate-200 border border-white/10 backdrop-blur-md">
                      {item.resolution}
                    </span>
                  )}
                </div>
              </div>

              {/* Title and details below poster */}
              <div className="mt-2.5 px-1">
                <h3
                  className="font-bold text-sm text-slate-100 group-hover/card:text-vault-accent transition-colors line-clamp-1"
                  title={item.title}
                >
                  {item.title}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                  {item.year && <span>{item.year}</span>}
                  {item.year && <span>&bull;</span>}
                  <span className="font-mono text-slate-500">
                    {isSeries ? item.totalSizeFormatted : item.sizeFormatted}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function JellyfinHome({
  libraries = [],
  mediaItems = [],
  seriesList = [],
  watchHistory = [],
  onPlayMedia,
  onViewSeries,
  onSelectLibrary,
  onNavigateToCatalog,
  onNavigateToFolders,
  onOpenAddLibrary,
  onRemoveHistory,
}) {
  // Helper to get items belonging to a library
  const getLibraryItems = (lib) => {
    const libType = (lib.type || '').toLowerCase();
    const libPath = (lib.path || '').toLowerCase();
    const folderName = libPath.split('/').filter(Boolean).pop() || '';

    // 1. Series matching (for TV or Anime)
    const matchingSeries = seriesList.filter((s) => {
      const sCat = (s.category || '').toLowerCase();
      const sPath = (s.relativePath || '').toLowerCase();
      return (
        sCat === libType ||
        sPath.startsWith(folderName + '/') ||
        (folderName && sPath.includes(folderName))
      );
    });

    // 2. Standalone videos matching
    const matchingVideos = mediaItems.filter((item) => {
      const itemCat = (item.category || '').toLowerCase();
      const itemPath = (item.relativePath || '').toLowerCase();
      return (
        itemCat === libType ||
        itemPath.startsWith(folderName + '/') ||
        (folderName && itemPath.includes(folderName))
      );
    });

    // If it's a TV/Anime library, prioritize series, otherwise videos
    let combined = [];
    if (libType === 'anime' || libType === 'tv') {
      combined = [...matchingSeries, ...matchingVideos.filter((v) => !v.seriesTitle)];
    } else {
      combined = [...matchingVideos, ...matchingSeries];
    }

    // Sort by modified date descending (newest first)
    return combined.sort((a, b) => {
      const dateA = new Date(a.modifiedAt || 0).getTime();
      const dateB = new Date(b.modifiedAt || 0).getTime();
      return dateB - dateA;
    });
  };

  return (
    <div className="w-full pb-20">
      {/* 1. TOP SECTION: JELLYFIN LIBRARIES / MY MEDIA */}
      <section className="mb-10 lg:mb-14">
        <div className="flex items-center justify-between mb-4 lg:mb-5 px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-6 bg-vault-accent rounded-full" />
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              My Media
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
              {libraries.length} Libraries
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToFolders}
              className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
            >
              <FolderTree className="w-3.5 h-3.5 text-vault-accent" />
              <span>Explore Folders</span>
            </button>
            {onOpenAddLibrary && (
              <button
                onClick={onOpenAddLibrary}
                className="text-xs font-semibold text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-vault-accent/20 hover:bg-vault-accent/30 border border-vault-accent/40 transition"
              >
                <Plus className="w-3.5 h-3.5 text-vault-accent" />
                <span className="hidden sm:inline">Add Library</span>
              </button>
            )}
          </div>
        </div>

        {/* Libraries Grid (Jellyfin Style Large Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 md:gap-5">
          {libraries.map((lib) => {
            const style = getLibraryStyle(lib.type, lib.name);
            const LibIcon = style.icon;
            const items = getLibraryItems(lib);

            return (
              <div
                key={lib.id}
                onClick={() => onSelectLibrary?.(lib)}
                className={`group relative aspect-[16/10] rounded-2xl overflow-hidden cursor-pointer border border-white/10 ${style.borderHover} shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 select-none`}
              >
                {/* Background Gradient */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${style.gradient} transition-all duration-300 group-hover:scale-105`}
                />

                {/* Subtle Grid Pattern Overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                {/* Content */}
                <div className="relative h-full flex flex-col justify-between p-4 z-10">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                      <LibIcon className={`w-5 h-5 ${style.iconColor}`} />
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${style.badgeBg}`}
                    >
                      {lib.type || 'Media'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-white text-base md:text-lg tracking-tight group-hover:text-vault-accent transition-colors line-clamp-1 drop-shadow-md">
                      {lib.name}
                    </h3>
                    <p className="text-[11px] font-medium text-slate-300 mt-0.5 flex items-center gap-1.5">
                      <span>{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                      <span>&bull;</span>
                      <span className="text-slate-400 capitalize">{lib.type}</span>
                    </p>
                  </div>
                </div>

                {/* Bottom colored accent border */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: style.accentColor }}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. SECOND SECTION: CONTINUE WATCHING */}
      <ContinueWatching
        historyItems={watchHistory}
        onPlayMedia={onPlayMedia}
        onResume={onPlayMedia}
        onRemove={onRemoveHistory}
        onClearHistory={onRemoveHistory}
      />

      {/* 3. SUBSEQUENT SECTIONS: RECENTLY ADDED IN {LIBRARY_NAME} */}
      {libraries.map((lib) => {
        const items = getLibraryItems(lib);
        if (items.length === 0) return null;

        const style = getLibraryStyle(lib.type, lib.name);
        const LibIcon = style.icon;

        return (
          <MediaRow
            key={lib.id}
            title={`Recently Added in ${lib.name}`}
            subtitle={`Latest additions in ${lib.name}`}
            icon={LibIcon}
            items={items.slice(0, 16)}
            onPlayMedia={onPlayMedia}
            onViewSeries={onViewSeries}
            onViewAll={() => onSelectLibrary?.(lib)}
          />
        );
      })}

      {/* If no media found at all */}
      {mediaItems.length === 0 && seriesList.length === 0 && (
        <div className="text-center py-20 bg-vault-900/40 rounded-3xl border border-white/5 p-8 max-w-lg mx-auto">
          <Compass className="w-16 h-16 text-vault-accent mx-auto mb-4 animate-pulse" />
          <h3 className="text-xl font-bold text-white mb-2">Your Media Library is Empty</h3>
          <p className="text-sm text-slate-400 mb-6">
            Place media files into your media directory or create a custom library source to start streaming!
          </p>
          <button
            onClick={onOpenAddLibrary}
            className="px-5 py-2.5 rounded-xl bg-vault-accent hover:bg-vault-accent-hover text-white font-bold text-sm shadow-lg shadow-vault-accent/30 transition"
          >
            Add First Library Source
          </button>
        </div>
      )}
    </div>
  );
}
