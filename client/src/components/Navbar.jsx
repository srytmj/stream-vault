import React, { useState, useRef, useEffect } from 'react';
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
  User,
  LogOut,
  Key,
  Shield,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
  onOpenChangePassword,
}) {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const categories = [
    { id: 'all', label: 'All Media', icon: Layers },
    { id: 'anime', label: 'Anime', icon: Sparkles },
    { id: 'movies', label: 'Movies', icon: Film },
    { id: 'tv', label: 'TV Shows', icon: Tv },
  ];

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
                <span className="font-extrabold text-xl tracking-tight text-white">
                  Stream<span className="text-vault-accent">Vault</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-vault-800 text-vault-accent border border-vault-700">
                  ZERO-TRANSCODE
                </span>
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
              <span className="hidden sm:inline">Catalog</span>
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
              placeholder="Search anime, movies, series..."
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
              <span>Add Library</span>
            </button>
          )}

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

            {/* User Account Menu (Komga / Jellyfin style) */}
            {user && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-vault-900 hover:bg-vault-850 border border-vault-800 hover:border-vault-700 rounded-xl transition text-xs font-semibold text-slate-200 group"
                  title="User Account"
                >
                  <div className="w-6 h-6 rounded-lg bg-vault-accent/20 border border-vault-accent/40 text-vault-accent flex items-center justify-center font-bold text-xs uppercase">
                    {user.username ? user.username[0] : 'U'}
                  </div>
                  <span className="max-w-[90px] truncate">{user.displayName || user.username}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition" />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-vault-900 border border-vault-800 rounded-2xl shadow-2xl py-2 z-50 animate-fade-in">
                    <div className="px-3.5 py-2 border-b border-vault-800/80 mb-1">
                      <p className="text-xs font-bold text-white truncate">
                        {user.displayName || user.username}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Shield className="w-3 h-3 text-vault-accent" />
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          {user.role} &bull; {user.authProvider || 'local'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenChangePassword?.();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-vault-850 flex items-center gap-2 transition"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>Change Password</span>
                    </button>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs text-red-400 hover:text-red-300 hover:bg-vault-850 flex items-center gap-2 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out (Logout)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
