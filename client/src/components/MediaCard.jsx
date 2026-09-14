import React from 'react';
import { Play, Layers } from 'lucide-react';
import { getCategoryBadgeClass } from '../utils/formatters';
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
      className="group relative bg-vault-900 rounded-md overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105 hover:z-10 shadow-lg hover:shadow-black/60"
    >
      {/* Poster / Thumbnail Area */}
      <div className={`relative w-full bg-vault-850 ${aspectRatioClass} overflow-hidden`}>
        {item.posterUrl ? (
          <img
            src={appendAuthToken(item.posterUrl)}
            alt={item.title}
            className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-60"
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
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-vault-800">
            <span className="text-xl font-black text-slate-700 select-none uppercase tracking-widest break-words w-full px-2">
              {item.title}
            </span>
          </div>
        )}

        {/* Play / View Overlay Icon */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-12 rounded-full border-2 border-white/80 bg-black/40 backdrop-blur-sm flex items-center justify-center text-white scale-75 group-hover:scale-100 transition-all duration-300">
            <Play className="w-6 h-6 fill-white ml-1" />
          </div>
        </div>

        {/* Gradient Overlay for bottom text styling */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end z-10">
          {item.category && item.category !== 'all' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-black/60 text-white backdrop-blur-md">
              {item.category}
            </span>
          )}
          
          {isSeries && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-vault-accent/90 text-white shadow-lg flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {item.totalEpisodes} EP
            </span>
          )}
        </div>

        {/* Info Overlay (Sits at the bottom of the poster) */}
        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
          <h3
            className="font-bold text-white text-sm sm:text-base leading-tight drop-shadow-md line-clamp-2"
            title={item.title}
          >
            {item.title}
          </h3>
          
          {/* Extensible Info Row */}
          <div className="flex items-center gap-2 mt-1.5 text-[11px] font-medium text-slate-300 drop-shadow-sm">
            {item.year && <span>{item.year}</span>}
            {!isSeries && item.resolution && (
              <span className="border border-slate-400 px-1 rounded-sm text-[9px]">
                {item.resolution}
              </span>
            )}
            <span className="font-mono opacity-80">
              {isSeries ? item.totalSizeFormatted : item.sizeFormatted}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
