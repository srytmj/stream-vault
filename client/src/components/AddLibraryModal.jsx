import React, { useState, useEffect } from 'react';
import { FolderPlus, X, AlertCircle, Check, Folder, ChevronRight, HardDrive } from 'lucide-react';
import { createLibrary, fetchSystemDirectories } from '../utils/api';

export default function AddLibraryModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [type, setType] = useState('anime');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // System Folder Browser State
  const [showBrowser, setShowBrowser] = useState(false);
  const [browserData, setBrowserData] = useState(null);
  const [browserLoading, setBrowserLoading] = useState(false);

  useEffect(() => {
    if (isOpen && showBrowser) {
      loadSystemDirectories(path || '');
    }
  }, [isOpen, showBrowser]); // load once when opened

  async function loadSystemDirectories(targetPath = '') {
    setBrowserLoading(true);
    try {
      const data = await fetchSystemDirectories(targetPath);
      setBrowserData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setBrowserLoading(false);
    }
  }

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !path.trim()) {
      setError('Library name and folder path are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const created = await createLibrary({
        name: name.trim(),
        path: path.trim(),
        type,
      });
      onCreated(created);
      setName('');
      setPath('');
      setShowBrowser(false);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add library.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-vault-900 border border-vault-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-vault-800 bg-vault-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-vault-accent/15 border border-vault-accent/30 flex items-center justify-center text-vault-accent">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Add New Library</h2>
              <p className="text-xs text-slate-400">Connect a directory from your homelab storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-vault-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
          {/* Main Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto w-full">
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Library Name
              </label>
              <input
                type="text"
                placeholder="e.g. Anime Collection 1080p, 4K Movies, TV Shows"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-vault-950 border border-vault-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-vault-accent"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Server Folder Path
                </label>
                <button
                  type="button"
                  onClick={() => setShowBrowser(!showBrowser)}
                  className="text-[11px] font-semibold text-vault-accent hover:text-white px-2 py-1 rounded bg-vault-accent/10 hover:bg-vault-accent/30 transition flex items-center gap-1.5"
                >
                  <Folder className="w-3.5 h-3.5" />
                  {showBrowser ? 'Hide Browser' : 'Browse Folders'}
                </button>
              </div>
              <input
                type="text"
                placeholder="/media/anime or /mnt/storage/movies"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-vault-950 border border-vault-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-vault-accent font-mono text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Content Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'anime', label: 'Anime Series' },
                  { id: 'movies', label: 'Movies / Films' },
                  { id: 'tv', label: 'TV Shows / Series' },
                  { id: 'mixed', label: 'Mixed / General' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setType(opt.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border text-left flex items-center justify-between transition ${
                      type === opt.id
                        ? 'bg-vault-accent/15 border-vault-accent text-vault-accent'
                        : 'bg-vault-950 border-vault-800 text-slate-400 hover:border-vault-700'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {type === opt.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Form Actions inside scrollable area to ensure visibility */}
            <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-vault-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-vault-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-bold text-white bg-vault-accent hover:bg-vault-accent-hover rounded-xl shadow-lg shadow-vault-accent/20 transition disabled:opacity-50"
              >
                {loading ? 'Adding Library...' : 'Add Library'}
              </button>
            </div>
          </form>

          {/* Side Panel: Folder Browser */}
          {showBrowser && (
            <div className="w-full md:w-72 bg-vault-950 border-t md:border-t-0 md:border-l border-vault-800 flex flex-col max-h-[300px] md:max-h-none h-full shrink-0">
              <div className="p-3 border-b border-vault-800 bg-vault-900/50">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5" /> Quick Roots
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {browserData?.quickRoots?.map((qr) => (
                    <button
                      key={qr.path}
                      type="button"
                      onClick={() => loadSystemDirectories(qr.path)}
                      className="px-2 py-1 text-[10px] font-mono bg-white/5 hover:bg-vault-accent/20 text-slate-400 hover:text-vault-accent rounded-lg border border-white/5 hover:border-vault-accent/30 transition truncate max-w-full"
                    >
                      {qr.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Breadcrumb Path */}
              <div className="px-3 py-2 border-b border-vault-800 bg-black/40 overflow-x-auto whitespace-nowrap scrollbar-hide">
                <div className="flex items-center text-[10px] font-mono text-slate-400">
                  {browserData?.breadcrumbs?.map((crumb, idx) => (
                    <React.Fragment key={crumb.path}>
                      {idx > 0 && <span className="mx-1 text-slate-600">/</span>}
                      <button
                        type="button"
                        onClick={() => loadSystemDirectories(crumb.path)}
                        className="hover:text-vault-accent transition"
                      >
                        {crumb.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Folder List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {browserLoading ? (
                  <div className="px-3 py-4 text-xs font-mono text-slate-500 text-center animate-pulse">
                    Scanning directory...
                  </div>
                ) : (
                  <>
                    {browserData?.parentPath && (
                      <button
                        type="button"
                        onClick={() => loadSystemDirectories(browserData.parentPath)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-vault-800 rounded-lg text-left transition group"
                      >
                        <Folder className="w-4 h-4 text-slate-400 group-hover:text-white" fill="currentColor" fillOpacity={0.2} />
                        <span className="text-xs font-mono text-slate-300 group-hover:text-white font-bold">..</span>
                      </button>
                    )}
                    
                    {browserData?.folders?.map((f) => (
                      <button
                        key={f.path}
                        type="button"
                        onClick={() => loadSystemDirectories(f.path)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-vault-800 rounded-lg text-left transition group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Folder className="w-4 h-4 text-amber-500" fill="currentColor" fillOpacity={0.2} />
                          <span className="text-xs font-mono text-slate-300 group-hover:text-white truncate">{f.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {f.videoCount > 0 && (
                            <span className="text-[9px] bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded-full border border-sky-500/20">
                              {f.videoCount}
                            </span>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-500 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </button>
                    ))}

                    {(!browserData?.folders || browserData.folders.length === 0) && !browserData?.parentPath && (
                      <div className="px-3 py-4 text-xs font-mono text-slate-500 text-center">
                        No subdirectories found
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Set Path Selection Footer */}
              <div className="p-3 border-t border-vault-800 bg-vault-900/80">
                <button
                  type="button"
                  onClick={() => {
                    setPath(browserData?.currentPath || '');
                    if (!name) {
                      const baseName = browserData?.currentPath.split('/').pop();
                      if (baseName) {
                        setName(baseName.charAt(0).toUpperCase() + baseName.slice(1));
                      }
                    }
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  Use Current Directory
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}