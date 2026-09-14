import React from 'react';
import { Play, MinusCircle } from 'lucide-react';
import { formatDuration } from '../utils/formatters';
import { appendAuthToken } from '../utils/api';

export default function ContinueWatching({
  historyItems = [],
  onResume,
  onRemove,
}) {
  if (!historyItems || historyItems.length === 0) return null;

  return (
    <section className="mb-10 lg:mb-14">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-4 lg:mb-6 px-1">
        Continue Watching
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {historyItems.map((item) => (
          <div
            key={item.id}
            onClick={() => onResume(item)}
            className="group relative bg-vault-900 rounded-md overflow-hidden cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
          >
            <div className="relative aspect-video w-full bg-vault-850">
              {/* Background Image */}
              {item.thumbnailUrl || item.posterUrl ? (
                <img
                  src={appendAuthToken(item.thumbnailUrl || item.posterUrl)}
                  alt={item.title}
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-vault-800 flex items-center justify-center">
                  <span className="text-slate-600 font-bold tracking-widest uppercase">
                    No Image
                  </span>
                </div>
              )}

              {/* Gradient overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

              {/* Centered Play Button (Hover) */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-14 h-14 rounded-full border-2 border-white/80 bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                  <Play className="w-7 h-7 fill-white ml-1" />
                </div>
              </div>

              {/* Remove Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.id);
                }}
                className="absolute top-3 right-3 text-white/50 hover:text-white bg-black/40 hover:bg-black/80 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all z-20 tooltip"
                title="Remove from history"
              >
                <MinusCircle className="w-5 h-5" />
              </button>

              {/* Info section at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="font-bold text-white text-sm md:text-base truncate drop-shadow-md">
                  {item.title}
                </h3>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[11px] font-medium text-slate-300">
                    {formatDuration(item.currentTime)} of {formatDuration(item.duration)}
                  </span>
                </div>
              </div>

              {/* Progress Bar anchored to bottom edge */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                <div
                  className="h-full bg-vault-accent transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
