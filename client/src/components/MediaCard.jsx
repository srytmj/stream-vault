import React from 'react';
import { Play, Film, Tv, Sparkles, Subtitles, Layers } from 'lucide-react';
import { getCategoryBadgeClass } from '../utils/formatters';

export default function MediaCard({
  item,
  isSeries = false,
  compact = false,
  onPlay,
  onViewSeries,
}) {
  const isAnime = item.category === 'anime';
  const isMovie = item.category === 'movies';

  // Subtitle indicator
  const hasSubtitles = item.subtitles && item.subtitles.length > 0;
  const hasAssSub = hasSubtitles && item.subtitles.some((s) => s.format === 'ass' || s.format === 'ssa');

  return (
    <div
      onClick={() => (isSeries ? onViewSeries(item) : onPlay(item))}
      className="group relative bg-vault-900 rounded-2xl overflow-hidden border border-vault-800/80 hover:border-vault-accent/60 transition-all duration-300 hover:shadow-xl hover:shadow-vault-accent/10 flex flex-col cursor-pointer"
    >
      {/* Poster / Thumbnail Area */}
      <div className="relative aspect-[16/10] w-full bg-gradient-to-tr from-vault-950 via-vault-850 to-vault-800 overflow-hidden">
        {item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
            {isAnime ? (
              <Sparkles className="w-8 h-8 text-amber-500/50 mb-1.5 group-hover:scale-110 group-hover:text-amber-400 transition-all duration-300" />
            ) : isMovie ? (
              <Film className="w-8 h-8 text-rose-500/50 mb-1.5 group-hover:scale-110 group-hover:text-rose-400 transition-all duration-300" />
            ) : (
              <Tv className="w-8 h-8 text-cyan-500/50 mb-1.5 group-hover:scale-110 group-hover:text-cyan-400 transition-all duration-300" />
            )}
            <span className="text-[11px] font-bold text-slate-300 line-clamp-2 px-1">
              {item.title}
            </span>
          </div>
        )}

        {/* Hover overlay with Play button */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-vault-accent text-white flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
        </div>

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-10">
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border backdrop-blur-md ${getCategoryBadgeClass(
              item.category
            )}`}
          >
            {item.category}
          </span>

          {isSeries && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-vault-800/90 text-slate-300 border border-vault-700 backdrop-blur-md flex items-center gap-0.5">
              <Layers className="w-2.5 h-2.5" />
              {item.totalEpisodes} EP
            </span>
          )}

          {!isSeries && item.extension && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-black/60 text-slate-300 border border-white/10 backdrop-blur-md font-mono">
              {item.extension.replace('.', '')}
            </span>
          )}
        </div>

        {/* Bottom Subtitle / Info Badge */}
        {hasAssSub && (
          <div className="absolute bottom-1.5 right-1.5 z-10">
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/90 text-black text-[9px] font-extrabold shadow backdrop-blur-md">
              <Subtitles className="w-2.5 h-2.5" />
              ASS
            </span>
          </div>
        )}
      </div>

      {/* Info Card Content */}
      <div className={`${compact ? 'p-2.5' : 'p-3.5'} flex-1 flex flex-col justify-between`}>
        <div>
          <h3
            className={`font-bold ${
              compact ? 'text-xs leading-snug' : 'text-sm'
            } text-slate-100 group-hover:text-vault-accent transition-colors line-clamp-1 mb-0.5`}
          >
            {item.title}
          </h3>

          {!isSeries && item.showName && item.showName !== item.title && (
            <p className="text-[11px] text-slate-400 line-clamp-1 mb-1.5">
              {item.showName}
            </p>
          )}
        </div>

        <div className="pt-1.5 border-t border-vault-800/60 flex items-center justify-between text-[10px] text-slate-400">
          <span>{isSeries ? item.totalSizeFormatted : item.sizeFormatted}</span>
          <span className="text-slate-500 truncate ml-1">
            {isSeries ? `${item.totalEpisodes} Eps` : 'Direct Stream'}
          </span>
        </div>
      </div>
    </div>
  );
}
