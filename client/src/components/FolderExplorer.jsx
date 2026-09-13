import React, { useState, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  Film,
  ArrowLeft,
  ChevronRight,
  Play,
  FileVideo,
  Clock,
  HardDrive,
  Subtitles,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { browseLibraryFolder } from '../utils/api';
import { formatTimeAgo } from '../utils/formatters';

export default function FolderExplorer({
  library,
  onSelectVideo,
  onBackToLibraries,
}) {
  const [currentSubpath, setCurrentSubpath] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadFolder(subpath = '') {
    if (!library) return;
    setLoading(true);
    setError(null);
    try {
      const res = await browseLibraryFolder(library.id, subpath);
      setData(res);
      setCurrentSubpath(subpath);
    } catch (err) {
      setError(err.message || 'Gagal membuka folder');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFolder('');
  }, [library?.id]);

  function handleNavigateUp() {
    if (!currentSubpath) {
      onBackToLibraries();
      return;
    }
    const parts = currentSubpath.split('/').filter(Boolean);
    parts.pop();
    loadFolder(parts.join('/'));
  }

  return (
    <div className="space-y-6">
      {/* Explorer Top Navigation & Breadcrumbs Bar */}
      <div className="bg-vault-900 border border-vault-800/80 rounded-2xl p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Breadcrumb Trail */}
          <div className="flex items-center flex-wrap gap-1.5 text-sm">
            <button
              onClick={onBackToLibraries}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-vault-800 hover:bg-vault-700 text-slate-300 hover:text-white rounded-lg transition font-medium text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Semua Library</span>
            </button>

            <ChevronRight className="w-4 h-4 text-slate-600" />

            <button
              onClick={() => loadFolder('')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                !currentSubpath
                  ? 'bg-vault-accent text-white'
                  : 'text-slate-300 hover:bg-vault-800'
              }`}
            >
              {library?.name || 'Library'}
            </button>

            {data?.breadcrumbs?.map((crumb, idx) => {
              const isLast = idx === data.breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.subpath}>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                  <button
                    onClick={() => loadFolder(crumb.subpath)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition truncate max-w-[180px] ${
                      isLast
                        ? 'bg-vault-accent/20 text-vault-accent border border-vault-accent/30'
                        : 'text-slate-300 hover:bg-vault-800'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadFolder(currentSubpath)}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white bg-vault-950 border border-vault-800 hover:border-vault-700 rounded-xl transition disabled:opacity-50"
              title="Refresh Folder"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-vault-accent' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-vault-accent animate-spin mb-3" />
          <p className="text-sm text-slate-400">Membaca isi direktori harddisk...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
          <p className="text-red-400 font-medium mb-3 text-sm">{error}</p>
          <button
            onClick={() => loadFolder('')}
            className="px-4 py-2 bg-vault-800 hover:bg-vault-700 text-white rounded-xl text-xs font-medium transition"
          >
            Kembali ke Root Library
          </button>
        </div>
      )}

      {/* Content View */}
      {!loading && !error && data && (
        <div className="space-y-8">
          {/* Subfolders Section */}
          {data.folders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3.5">
                <FolderOpen className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Direktori & Folder ({data.folders.length})
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {data.folders.map((folder) => (
                  <button
                    key={folder.subpath}
                    onClick={() => loadFolder(folder.subpath)}
                    className="group flex flex-col p-3.5 bg-vault-900/90 hover:bg-vault-850 border border-vault-800 hover:border-vault-700 rounded-xl text-left transition hover:scale-[1.02] shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition">
                        <Folder className="w-5 h-5 fill-amber-400/20" />
                      </div>
                      {folder.childCount > 0 && (
                        <span className="text-[10px] font-mono text-slate-400 bg-vault-950 px-2 py-0.5 rounded-full border border-vault-800">
                          {folder.childCount}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate w-full" title={folder.name}>
                      {folder.name}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      {folder.hasVideos ? 'Ada video' : 'Folder'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Video Files Section */}
          {data.files.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-vault-accent" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    File Video Siap Putar ({data.files.length})
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  100% Client-Side Playback • Zero Transcode
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {data.files.map((file) => {
                  const hasAss = file.subtitles?.some((s) => s.format === 'ass' || s.format === 'ssa');
                  return (
                    <div
                      key={file.id}
                      onClick={() => onSelectVideo(file)}
                      className="group flex items-start gap-3.5 p-3.5 bg-vault-900/90 hover:bg-vault-850 border border-vault-800 hover:border-vault-accent/40 rounded-xl cursor-pointer transition shadow-sm hover:shadow-lg"
                    >
                      {/* Video / Thumbnail Icon */}
                      <div className="w-16 h-20 rounded-lg overflow-hidden bg-vault-950 border border-vault-800 flex-shrink-0 relative flex items-center justify-center">
                        {file.posterUrl ? (
                          <img
                            src={file.posterUrl}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                        ) : (
                          <FileVideo className="w-7 h-7 text-slate-600 group-hover:text-vault-accent transition" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Play className="w-6 h-6 text-white fill-white drop-shadow-md" />
                        </div>
                      </div>

                      {/* File Details */}
                      <div className="flex-1 min-w-0">
                        <h4
                          className="text-xs font-bold text-slate-200 group-hover:text-white line-clamp-2 transition mb-1 leading-snug"
                          title={file.filename}
                        >
                          {file.title || file.filename}
                        </h4>
                        
                        <p className="text-[11px] font-mono text-slate-500 truncate mb-2">
                          {file.filename}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                          <span className="px-1.5 py-0.5 bg-vault-950 rounded border border-vault-800 font-mono text-[10px] text-vault-accent font-bold">
                            {file.extension.toUpperCase().replace('.', '')}
                          </span>
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3 text-slate-500" />
                            {file.sizeFormatted}
                          </span>
                          {hasAss && (
                            <span className="px-1.5 py-0.5 bg-purple-500/15 text-purple-400 border border-purple-500/30 rounded text-[9px] font-bold">
                              ASS STYLED
                            </span>
                          )}
                          {file.subtitles?.length > 0 && (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                              <Subtitles className="w-3 h-3" />
                              {file.subtitles.length} Sub
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {data.folders.length === 0 && data.files.length === 0 && (
            <div className="text-center py-16 bg-vault-900/50 border border-vault-800 rounded-2xl">
              <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-300">Folder ini kosong</p>
              <p className="text-xs text-slate-500 mt-1">
                Tidak ada file video atau subdirektori di path ini.
              </p>
              <button
                onClick={handleNavigateUp}
                className="mt-4 px-4 py-2 bg-vault-800 hover:bg-vault-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Kembali ke Folder Sebelumnya
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
