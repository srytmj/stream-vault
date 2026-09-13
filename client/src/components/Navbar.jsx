import React from 'react';
import { Play, Search, RefreshCw, Cpu, HardDrive, Keyboard, Film, Tv, Sparkles, Layers } from 'lucide-react';

export default function Navbar({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  serverHealth,
  onRefresh,
  isRefreshing,
  onOpenShortcuts,
  onOpenStats,
}) {
  const categories = [
    { id: 'all', label: 'All Media', icon: Layers },
    { id: 'anime', label: 'Anime', icon: Sparkles },
    { id: 'movies', label: 'Movies', icon: Film },
    { id: 'tv', label: 'TV Shows', icon: Tv },
  ];

  return (
    <header className="sticky top-0 z-40 bg-vault-950/80 backdrop-blur-md border-b border-vault-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-vault-accent to-amber-500 flex items-center justify-center shadow-lg shadow-vault-accent/25 group-hover:scale-105 transition-transform">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-white">Stream<span className="text-vault-accent">Vault</span></span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-vault-800 text-vault-accent border border-vault-700">ZERO-TRANSCODE</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">100% Client-Side Hardware Playback</p>
            </div>
          </a>

          {/* Quick Stats on Mobile */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-vault-850 hover:bg-vault-800 border border-vault-700 text-slate-300"
              title="Rescan Media"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-vault-accent' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search anime, movies, episodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-vault-900 border border-vault-800 focus:border-vault-accent rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-vault-accent/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-vault-800"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Tabs & Server Status */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center bg-vault-900 p-1 rounded-xl border border-vault-800">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-vault-accent text-white shadow-md shadow-vault-accent/20 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-vault-850'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-vault-800">
            {/* Server Health Pill */}
            <button
              onClick={onOpenStats}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-vault-900 border border-vault-800 hover:border-vault-700 text-xs text-slate-300 group transition-all"
              title="Click to view server performance"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-emerald-400 font-semibold">0% CPU</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">{serverHealth?.memory?.rssMb || 20} MB</span>
            </button>

            {/* Rescan Button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-vault-900 hover:bg-vault-850 border border-vault-800 hover:border-vault-700 text-slate-300 transition-all hover:text-vault-accent"
              title="Rescan media directory"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-vault-accent' : ''}`} />
            </button>

            {/* Keyboard Shortcuts Button */}
            <button
              onClick={onOpenShortcuts}
              className="p-2 rounded-xl bg-vault-900 hover:bg-vault-850 border border-vault-800 hover:border-vault-700 text-slate-300 transition-all hover:text-slate-100"
              title="Keyboard Shortcuts"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </header>
  );
}
