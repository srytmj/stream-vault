import React from 'react';
import { Play, Layers } from 'lucide-react';
import { appendAuthToken } from '../utils/api';
import VideoThumbnail from './VideoThumbnail';

export default function MediaCard({
  item,
  isSeries = false,
  compact = false,
  onPlay,
  onViewSeries,
}) {
  const isPosterArt = isSeries || item.category === 'movies' || item.posterUrl;
  const aspectRatioClass = isPosterArt ? 'aspect-[2/3]' : 'aspect-video';

  return (
    <div
      onClick={() => (isSeries ? onViewSeries(item) : onPlay(item))}
      className="group flex flex-col cursor-pointer text-left transition-all"
    >
      {/* Poster / Thumbnail Box */}
      <div className={`relative w-full rounded-xl overflow-hidden bg-vault-900 border border-white/10 group-hover:border-vault-accent/60 ${aspectRatioClass} shadow-md group-hover:shadow-xl group-hover:shadow-black/60 transition-all duration-300`}>
        {item.posterUrl ? (
          <img
            src={appendAuthToken(item.posterUrl)}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : !isSeries && (item.thumbnailUrl || item.streamUrl) ? (
          <VideoThumbnail
            streamUrl={item.streamUrl}
            posterUrl={null}
            thumbnailUrl={item.thumbnailUrl}
            alt={item.title}
            aspectRatio={aspectRatioClass}
            showPlayIcon={false}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-tr from-vault-950 to-vault-850">
            <span className="text-sm font-bold text-slate-400 select-none uppercase tracking-wider text-center px-2">
              {item.title}
            </span>
          </div>
        )}

        {/* Hover Play Button Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-[1px]">
          <div className="w-12 h-12 rounded-full bg-vault-accent text-white flex items-center justify-center shadow-lg shadow-vault-accent/40 transform scale-75 group-hover:scale-100 transition-transform">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* Badges on Top */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
          {item.category && item.category !== 'all' && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/75 text-slate-200 border border-white/10 backdrop-blur-md">
              {item.category}
            </span>
          )}
          {isSeries && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-vault-accent text-white shadow flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {item.totalEpisodes} EP
            </span>
          )}
        </div>
      </div>

      {/* Title & Metadata Below (Jellyfin Style) */}
      <div className="mt-2.5 px-0.5">
        <h3
          className="font-semibold text-sm text-slate-200 group-hover:text-vault-accent transition-colors line-clamp-1"
          title={item.title}
        >
          {item.title}
        </h3>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
          {item.year && <span>{item.year}</span>}
          {item.year && <span>•</span>}
          {!isSeries && item.resolution && (
            <span className="border border-white/15 px-1 py-0.2 rounded text-[9px] font-mono text-slate-300">
              {item.resolution}
            </span>
          )}
          <span className="font-mono text-slate-500">
            {isSeries ? item.totalSizeFormatted : item.sizeFormatted}
          </span>
        </div>
      </div>
    </div>
  );
}
