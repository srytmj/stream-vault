import React from 'react';
import { Play, Clock, X, Sparkles } from 'lucide-react';
import { formatDuration, formatTimeAgo } from '../utils/formatters';

export default function ContinueWatching({
  historyItems = [],
  onResume,
  onRemove,
}) {
  if (!historyItems || historyItems.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-vault-accent" />
        <h2 className="text-base font-bold text-white tracking-tight">Continue Watching</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {historyItems.map((item) => (
          <div
            key={item.id}
            className="group relative bg-vault-900 border border-vault-800 rounded-2xl overflow-hidden hover:border-vault-accent/50 transition-all flex flex-col justify-between"
          >
            {/* Header Thumbnail / Title Area */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-vault-accent">
                    {item.category || 'Anime'}
                  </span>
                  <h3 className="font-bold text-xs text-white truncate group-hover:text-vault-accent transition-colors">
                    {item.title}
                  </h3>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.id);
                  }}
                  className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-vault-800 transition-colors"
                  title="Remove from history"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                <span>{formatDuration(item.currentTime)} / {formatDuration(item.duration)}</span>
                <span className="text-slate-500">{formatTimeAgo(item.updatedAt)}</span>
              </div>
            </div>

            {/* Bottom Progress Bar & Resume Button */}
            <div>
              <div className="w-full bg-vault-800 h-1.5 overflow-hidden">
                <div
                  className="bg-vault-accent h-full transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>

              <button
                onClick={() => onResume(item)}
                className="w-full py-2.5 px-4 bg-vault-850 hover:bg-vault-accent text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume ({item.progress}%)</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
