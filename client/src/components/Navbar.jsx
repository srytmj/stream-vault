import React from 'react';
import {
  Play,
  Search,
  RefreshCw,
  Cpu,
  HardDrive,
  Keyboard,
  Film,
  Tv,
  Sparkles,
  Layers,
  FolderTree,
  FolderPlus,
} from 'lucide-react';

export default function Navbar({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  activeTab = 'catalog', // 'catalog' or 'explorer'
  setActiveTab,
  onOpenAddLibrary,
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
    <header className="sticky top-0 z-40 bg-vault-950/90 backdrop-blur-md border-b border-vault-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand Logo & View Tabs */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-vault-accent to-amber-500 flex items-center justify-center shadow-lg shadow-vault-accent/25 group-hover:scale-105 transition-transform">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-white">Stream<span className="text-vault-accent">Vault</span></span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-vault-800 text-vault-accent border border-vault-700">ZERO-TRANSCODE</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">100% Client Hardware Playback</p>
            </div>
          </a>

          {/* Catalog vs Folder Explorer Navigation */}
          <div className="flex items-center bg-vault-900 p-1 rounded-xl border border-vault-800 text-xs">
            <button
              onClick={() => setActiveTab?.('catalog')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'catalog'
                  ? 'bg-vault-800 text-white font-semibold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-vault-accent" />
              <span className="hidden sm:inline">Katalog</span>
            </button>
            <button
              onClick={() => setActiveTab?.('explorer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'explorer'
                  ? 'bg-vault-800 text-white font-semibold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5 text-amber-400" />
              <span>Folder Explorer</span>
            </button>
          </div>
        </div>

        {/* Search Bar (When on Catalog tab) */}
        {activeTab === 'catalog' && (
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari anime, film, episode..."
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
        )}

        {/* Category Tabs & Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end overflow-x-auto pb-1 md:pb-0">
          {activeTab === 'catalog' ? (
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
          ) : (
            /* Button Add Library */
            <button
              onClick={onOpenAddLibrary}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-vault-accent hover:bg-vault-accent-hover text-white rounded-xl text-xs font-bold shadow-lg shadow-vault-accent/20 transition"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Tambah Library</span>
            </button>
          )}

          {/* Action buttons */}
          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-vault-800">
            {/* Server Health Pill */}
            <button
              onClick={onOpenStats}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-vault-900 border border-vault-800 hover:border-vault-700 text-xs text-slate-300 group transition-all"
              title="Klik untuk melihat performa server"
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
              title="Rescan direktori media"
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
