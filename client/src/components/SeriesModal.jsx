import React, { useState } from 'react';
import { Play, Layers, X, Sparkles, Subtitles, Search, Calendar, HardDrive } from 'lucide-react';
import { getCategoryBadgeClass } from '../utils/formatters';

export default function SeriesModal({
  isOpen = true,
  series,
  onClose,
  onPlayEpisode,
}) {
  const [filterQuery, setFilterQuery] = useState('');

  if (!isOpen || !series) return null;

  const filteredEpisodes = series.episodes.filter((ep) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      ep.title.toLowerCase().includes(q) ||
      ep.filename.toLowerCase().includes(q) ||
      String(ep.episode).includes(q)
    );
  });

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-vault-900 border border-vault-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header with Artwork / Title */}
        <div className="p-6 bg-gradient-to-b from-vault-850 to-vault-900 border-b border-vault-800 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadgeClass(
                  series.category
                )}`}
              >
                {series.category}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-vault-accent" />
                {series.totalEpisodes} Episodes
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                {series.totalSizeFormatted}
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-white tracking-tight truncate">
              {series.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-vault-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        {series.episodes.length > 4 && (
          <div className="px-6 py-3 border-b border-vault-800/80 bg-vault-950/40">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter episode by number or title..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-vault-900 border border-vault-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-vault-accent"
              />
            </div>
          </div>
        )}

        {/* Episodes Scrollable List */}
        <div className="p-6 overflow-y-auto space-y-2 flex-1 divide-y divide-vault-800/40">
          {filteredEpisodes.map((ep) => {
            const hasAss = ep.subtitles && ep.subtitles.some((s) => s.format === 'ass' || s.format === 'ssa');

            return (
              <div
                key={ep.id}
                onClick={() => onPlayEpisode(ep)}
                className="pt-2 first:pt-0 group flex items-center justify-between p-3 rounded-xl hover:bg-vault-850/80 border border-transparent hover:border-vault-800 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-vault-800 group-hover:bg-vault-accent text-slate-300 group-hover:text-white flex items-center justify-center shrink-0 transition-colors font-mono text-xs font-bold shadow-inner">
                    <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-200 group-hover:text-vault-accent transition-colors truncate">
                      {ep.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                      <span className="font-mono text-[10px] text-slate-500">{ep.extension.toUpperCase()}</span>
                      <span>•</span>
                      <span>{ep.sizeFormatted}</span>
                      {hasAss && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400 font-medium flex items-center gap-0.5">
                            <Subtitles className="w-3 h-3" />
                            ASS Styled
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg bg-vault-accent text-white text-xs font-bold transition-opacity shadow-sm shadow-vault-accent/30 shrink-0 ml-3">
                  Play
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
