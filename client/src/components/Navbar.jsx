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
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  activeTab = 'catalog',
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
    { id: 'all', label: 'Home' },
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

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-vault-950/95 backdrop-blur-md shadow-lg shadow-black/50' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
      <div className="px-4 md:px-8 lg:px-12 flex items-center justify-between h-16 md:h-20 gap-6">
        
        {/* Left: Brand & Navigation */}
        <div className="flex items-center gap-8 md:gap-12">
          {/* Brand Logo */}
          <a href="#" className="flex items-center gap-2 group shrink-0">
            <div className="bg-vault-accent rounded-full p-1.5 flex items-center justify-center">
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            </div>
            <span className="font-black text-xl md:text-2xl tracking-tight text-white hidden sm:block">
              StreamVault
            </span>
          </a>

          {/* Primary Nav Links */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => setActiveTab?.('catalog')}
              className={`text-sm font-medium transition-colors hover:text-white ${activeTab === 'catalog' ? 'text-white' : 'text-slate-300'}`}
            >
              Catalog
            </button>
            <button
              onClick={() => setActiveTab?.('explorer')}
              className={`text-sm font-medium transition-colors hover:text-white ${activeTab === 'explorer' ? 'text-white' : 'text-slate-300'}`}
            >
              Files
            </button>
            <button
              onClick={onOpenStats}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Diagnostics
            </button>
          </nav>
        </div>

        {/* Right: Search & User Controls */}
        <div className="flex items-center gap-4 md:gap-6 flex-1 justify-end">
          
          {/* Category Tabs (Catalog Only) */}
          {activeTab === 'catalog' && (
            <div className="hidden lg:flex items-center gap-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-white/10 text-white font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Flexible Space */}
          <div className="flex-1 lg:hidden"></div>

          {/* Add Library Button (Explorer) */}
          {activeTab === 'explorer' && (
            <button
              onClick={onOpenAddLibrary}
              className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-medium transition-all"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Add Source</span>
            </button>
          )}

          {/* Search Bar */}
          {activeTab === 'catalog' && (
            <div className="relative group max-w-[200px] sm:max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-white transition-colors" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/20 focus:border-white focus:bg-black/60 rounded-full py-1.5 pl-9 pr-4 text-sm text-white placeholder-slate-400 focus:outline-none transition-all duration-300"
              />
            </div>
          )}

          {/* Utility Actions */}
          <div className="flex items-center gap-3 border-l border-white/15 pl-4 md:pl-6">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="text-slate-300 hover:text-white transition-colors"
              title="Rescan media directory"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-vault-accent' : ''}`} />
            </button>

            <button
              onClick={onOpenShortcuts}
              className="text-slate-300 hover:text-white transition-colors hidden sm:block"
              title="Keyboard Shortcuts"
            >
              <Keyboard className="w-5 h-5" />
            </button>

            {/* User Account Menu */}
            {user && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="w-8 h-8 rounded-full bg-vault-accent/20 border border-vault-accent/50 flex items-center justify-center transition-transform hover:scale-105"
                  title="User Account"
                >
                  <span className="font-bold text-vault-accent text-sm uppercase">
                    {user.username ? user.username[0] : 'U'}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-vault-900 border border-vault-800 rounded-md shadow-2xl py-1 z-50">
                    <div className="px-4 py-3 border-b border-vault-800">
                      <p className="text-sm font-semibold text-white truncate">
                        {user.displayName || user.username}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Shield className="w-3 h-3 text-vault-accent" />
                        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                          {user.role} {user.authProvider ? `• ${user.authProvider}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onOpenChangePassword?.();
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:text-white hover:bg-vault-800 transition-colors flex items-center gap-3"
                      >
                        <Key className="w-4 h-4" />
                        Account Settings
                      </button>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:text-white hover:bg-vault-800 transition-colors flex items-center gap-3"
                      >
                        <LogOut className="w-4 h-4" />
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
