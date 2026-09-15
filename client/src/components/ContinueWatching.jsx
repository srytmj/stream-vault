import React, { useRef } from 'react';
import { Play, X, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { formatDuration } from '../utils/formatters';
import { appendAuthToken } from '../utils/api';

export default function ContinueWatching({
  historyItems = [],
  onResume,
  onPlayMedia,
  onRemove,
  onClearHistory,
}) {
  const scrollContainerRef = useRef(null);
  const playHandler = onResume || onPlayMedia;
  const removeHandler = onRemove || onClearHistory;

  if (!historyItems || historyItems.length === 0) return null;

  const scroll = (direction) => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === 'left' ? -380 : 380;
    scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  return (
    <section className="mb-10 lg:mb-14 relative group/section">
      <div className="flex items-center justify-between mb-4 lg:mb-5 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-6 bg-vault-accent rounded-full" />
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Continue Watching
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
            {historyItems.length}
          </span>
        </div>

        {/* Carousel Navigation Arrows (Desktop) */}
        <div className="hidden md:flex items-center gap-1.5 opacity-80 group-hover/section:opacity-100 transition-opacity">
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

      {/* Horizontal Carousel */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-3 pt-1 px-1 scroll-smooth snap-x snap-mandatory scrollbar-none -mx-4 px-4 md:mx-0 md:px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {historyItems.map((item) => {
          const timeLeftSeconds = Math.max(0, (item.duration || 0) - (item.currentTime || 0));
          const hasImage = item.thumbnailUrl || item.posterUrl;

          return (
            <div
              key={item.id}
              onClick={() => playHandler?.(item)}
              className="group/card flex-none w-[280px] sm:w-[320px] md:w-[350px] snap-start bg-vault-900/90 hover:bg-vault-850 rounded-2xl overflow-hidden cursor-pointer border border-white/10 hover:border-vault-accent/60 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 select-none"
            >
              <div className="relative aspect-video w-full bg-vault-950 overflow-hidden">
                {hasImage ? (
                  <img
                    src={appendAuthToken(item.thumbnailUrl || item.posterUrl)}
                    alt={item.title}
                    className="w-full h-full object-cover opacity-75 group-hover/card:opacity-95 group-hover/card:scale-105 transition-all duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-vault-900 via-vault-950 to-black flex items-center justify-center">
                    <Play className="w-8 h-8 text-vault-accent/40" />
                  </div>
                )}

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

                {/* Hover Play Circle */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all duration-200">
                  <div className="w-12 h-12 rounded-full bg-vault-accent text-white flex items-center justify-center shadow-lg shadow-vault-accent/40 transform scale-75 group-hover/card:scale-100 transition-transform">
                    <Play className="w-6 h-6 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Quick Remove Action */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeHandler?.(item.id);
                  }}
                  className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 hover:bg-rose-600/90 text-white/70 hover:text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover/card:opacity-100 transition-all z-20"
                  title="Remove from Continue Watching"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Remaining Time Badge */}
                {timeLeftSeconds > 0 && (
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-medium text-slate-200 border border-white/10">
                    <Clock className="w-3 h-3 text-vault-accent" />
                    <span>{formatDuration(timeLeftSeconds)} left</span>
                  </div>
                )}

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60">
                  <div
                    className="h-full bg-gradient-to-r from-vault-accent to-emerald-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, item.progress || 0)}%` }}
                  />
                </div>
              </div>

              {/* Card Meta */}
              <div className="p-3.5">
                <h3
                  className="font-bold text-white text-sm truncate group-hover/card:text-vault-accent transition-colors"
                  title={item.title}
                >
                  {item.title}
                </h3>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span>
                    {formatDuration(item.currentTime || 0)} / {formatDuration(item.duration || 0)}
                  </span>
                  <span className="font-mono text-vault-accent font-semibold">
                    {Math.round(item.progress || 0)}%
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
