import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Search,
  RefreshCw,
  Keyboard,
  Layers,
  FolderTree,
  FolderPlus,
  LogOut,
  Key,
  Shield,
  Activity,
  Home as HomeIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  activeTab = 'home',
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
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'anime', label: 'Anime' },
    { id: 'tv', label: 'Series' },
    { id: 'movies', label: 'Movies' },
  ];

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (val.trim() && activeTab !== 'catalog') {
      setActiveTab?.('catalog');
    }
  };

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-vault-950/95 backdrop-blur-md shadow-lg shadow-black/50 border-b border-white/5'
          : 'bg-gradient-to-b from-black/90 via-black/50 to-transparent'
      }`}
    >
      <div className="px-4 md:px-8 lg:px-12 flex items-center justify-between h-16 md:h-20 gap-4 md:gap-6">
        {/* Left: Brand & Navigation */}
        <div className="flex items-center gap-4 sm:gap-8 md:gap-10">
          {/* Brand Logo */}
          <button
            onClick={() => setActiveTab?.('home')}
            className="flex items-center gap-2.5 group shrink-0 focus:outline-none text-left"
          >
            <div className="w-8 h-8 md:w-9 md:h-9 bg-vault-accent rounded-xl flex items-center justify-center shadow-lg shadow-vault-accent/30 group-hover:scale-105 transition-transform">
              <Play className="w-4 h-4 md:w-5 md:h-5 text-white fill-white ml-0.5" />
            </div>
            <span className="font-extrabold text-lg md:text-xl tracking-tight text-white">
              Stream<span className="text-vault-accent">Vault</span>
            </span>
          </button>

          {/* Primary Nav Links (Desktop & Tablet) */}
          <nav className="flex items-center gap-1 sm:gap-2 bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-semibold">
            <button
              onClick={() => setActiveTab?.('home')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'home'
                  ? 'bg-vault-accent text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setActiveTab?.('catalog')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'catalog'
                  ? 'bg-vault-accent text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Catalog
            </button>
            <button
              onClick={() => setActiveTab?.('explorer')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'explorer'
                  ? 'bg-vault-accent text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Folders
            </button>
          </nav>
        </div>

        {/* Right: Search, Categories & Controls */}
        <div className="flex items-center gap-3 md:gap-4 flex-1 justify-end">
          {/* Category Tabs (Catalog View Desktop) */}
          {activeTab === 'catalog' && (
            <div className="hidden lg:flex items-center gap-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory?.(cat.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Add Library Button (Explorer) */}
          {activeTab === 'explorer' && (
            <button
              onClick={onOpenAddLibrary}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl text-xs font-semibold transition-all"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Add Source</span>
            </button>
          )}

          {/* Search Bar (Available on Home and Catalog) */}
          {activeTab !== 'explorer' && (
            <div className="relative group max-w-[170px] sm:max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-white transition-colors" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full bg-black/40 border border-white/15 focus:border-vault-accent/60 focus:bg-black/60 rounded-xl py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-400 focus:outline-none transition-all"
              />
            </div>
          )}

          {/* Utility Actions */}
          <div className="flex items-center gap-2 border-l border-white/10 pl-3">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              title="Rescan media directory"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-vault-accent' : ''}`} />
            </button>

            <button
              onClick={onOpenStats}
              className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5 hidden sm:block"
              title="Server Stats & Performance"
            >
              <Activity className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenShortcuts}
              className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5 hidden md:block"
              title="Keyboard Shortcuts"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* User Account Menu */}
            {user && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="w-8 h-8 rounded-xl bg-vault-accent/20 border border-vault-accent/40 flex items-center justify-center transition-transform hover:scale-105"
                  title="User Account"
                >
                  <span className="font-bold text-vault-accent text-xs uppercase">
                    {user.username ? user.username[0] : 'U'}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-vault-900 border border-white/10 rounded-xl shadow-2xl py-1 z-50">
                    <div className="px-4 py-2.5 border-b border-white/10">
                      <p className="text-xs font-bold text-white truncate">
                        {user.displayName || user.username}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Shield className="w-3 h-3 text-vault-accent" />
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                          {user.role}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onOpenStats?.();
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2.5 sm:hidden"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        Diagnostics
                      </button>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onOpenChangePassword?.();
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2.5"
                      >
                        <Key className="w-3.5 h-3.5" />
                        Account Settings
                      </button>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-rose-400 hover:text-rose-300 hover:bg-white/5 transition-colors flex items-center gap-2.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
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
