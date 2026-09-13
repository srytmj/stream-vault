import React from 'react';
import { Play, Film, Tv, Sparkles, Subtitles, Layers } from 'lucide-react';
import { getCategoryBadgeClass } from '../utils/formatters';

export default function MediaCard({
  item,
  isSeries = false,
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
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
            {isAnime ? (
              <Sparkles className="w-10 h-10 text-amber-500/50 mb-2 group-hover:scale-110 group-hover:text-amber-400 transition-all duration-300" />
            ) : isMovie ? (
              <Film className="w-10 h-10 text-rose-500/50 mb-2 group-hover:scale-110 group-hover:text-rose-400 transition-all duration-300" />
            ) : (
              <Tv className="w-10 h-10 text-cyan-500/50 mb-2 group-hover:scale-110 group-hover:text-cyan-400 transition-all duration-300" />
            )}
            <span className="text-xs font-bold text-slate-300 line-clamp-2 px-2">
              {item.title}
            </span>
          </div>
        )}

        {/* Hover overlay with Play button */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-vault-accent text-white flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-6 h-6 fill-white ml-0.5" />
          </div>
        </div>

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md ${getCategoryBadgeClass(
              item.category
            )}`}
          >
            {item.category}
          </span>

          {isSeries && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-vault-800/90 text-slate-300 border border-vault-700 backdrop-blur-md flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {item.totalEpisodes} EP
            </span>
          )}

          {!isSeries && item.extension && (
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/60 text-slate-300 border border-white/10 backdrop-blur-md">
              {item.extension.replace('.', '')}
            </span>
          )}
        </div>

        {/* Bottom Subtitle / Info Badge */}
        {hasAssSub && (
          <div className="absolute bottom-2 right-2 z-10">
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/90 text-black text-[10px] font-extrabold shadow backdrop-blur-md">
              <Subtitles className="w-3 h-3" />
              ASS STYLED
            </span>
          </div>
        )}
      </div>

      {/* Info Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-sm text-slate-100 group-hover:text-vault-accent transition-colors line-clamp-1 mb-1">
            {item.title}
          </h3>

          {!isSeries && item.showName && item.showName !== item.title && (
            <p className="text-xs text-slate-400 line-clamp-1 mb-2">
              {item.showName}
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-vault-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span>{isSeries ? item.totalSizeFormatted : item.sizeFormatted}</span>
          <span className="text-slate-500">
            {isSeries ? `${item.totalEpisodes} Episodes` : 'Direct Stream'}
          </span>
        </div>
      </div>
    </div>
  );
}
