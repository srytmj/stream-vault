import React, { useState } from 'react';
import { Play, Layers, X, Sparkles, Subtitles, Search, Calendar, HardDrive } from 'lucide-react';
import { getCategoryBadgeClass } from '../utils/formatters';

export default function SeriesModal({
  series,
  onClose,
  onPlayEpisode,
}) {
  const [filterQuery, setFilterQuery] = useState('');

  if (!series) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative bg-vault-900 border border-vault-700/80 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
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
            className="p-2 rounded-xl bg-vault-800 hover:bg-vault-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick action + Episode Filter */}
        <div className="px-6 py-3 bg-vault-950/60 border-b border-vault-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter episodes..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-vault-900 border border-vault-800 focus:border-vault-accent rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>

          {series.episodes.length > 0 && (
            <button
              onClick={() => onPlayEpisode(series.episodes[0])}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-vault-accent hover:bg-vault-accentHover text-white text-xs font-bold transition-all shadow-md shadow-vault-accent/20"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Play Episode 1</span>
            </button>
          )}
        </div>

        {/* Episode list */}
        <div className="p-6 overflow-y-auto space-y-2.5 flex-1">
          {filteredEpisodes.map((ep, idx) => {
            const hasAss = ep.subtitles?.some((s) => s.format === 'ass' || s.format === 'ssa');
            return (
              <div
                key={ep.id}
                onClick={() => onPlayEpisode(ep)}
                className="group p-3 rounded-xl bg-vault-850/70 hover:bg-vault-800 border border-vault-800 hover:border-vault-accent/50 transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-vault-900 group-hover:bg-vault-accent text-slate-400 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                    <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-vault-accent font-bold">
                        EP {ep.episode !== null ? ep.episode : idx + 1}
                      </span>
                      <h4 className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                        {ep.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{ep.sizeFormatted}</span>
                      <span>•</span>
                      <span>{ep.extension.toUpperCase()}</span>
                      {hasAss && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                            <Subtitles className="w-3 h-3" /> ASS Styled
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button className="shrink-0 px-3 py-1.5 rounded-lg bg-vault-800 group-hover:bg-vault-accent text-slate-300 group-hover:text-white text-xs font-semibold transition-all">
                  Play
                </button>
              </div>
            );
          })}

          {filteredEpisodes.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-400">
              No episodes matched your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
