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
  LayoutGrid,
  List,
  Table,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import { browseLibraryFolder, appendAuthToken } from '../utils/api';
import { formatTimeAgo } from '../utils/formatters';
import VideoThumbnail from './VideoThumbnail';
import FolderThumbModal from './FolderThumbModal';

export default function FolderExplorer({
  library,
  initialSubpath = '',
  onNavigate,
  onSelectVideo,
  onBackToLibraries,
}) {
  const [currentSubpath, setCurrentSubpath] = useState(initialSubpath || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [configFolder, setConfigFolder] = useState(null);
  const [folderViewMode, setFolderViewMode] = useState(() => {
    return localStorage.getItem('sv_folder_view_mode') || 'grid';
  });

  const handleViewModeChange = (mode) => {
    setFolderViewMode(mode);
    localStorage.setItem('sv_folder_view_mode', mode);
  };

  async function loadFolder(subpath = '', syncUrl = true) {
    if (!library) return;
    setLoading(true);
    setError(null);
    try {
      const res = await browseLibraryFolder(library.id, subpath);
      setData(res);
      setCurrentSubpath(subpath);
      if (syncUrl && onNavigate) {
        onNavigate(subpath);
      }
    } catch (err) {
      setError(err.message || 'Failed to open folder');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFolder(initialSubpath || '', false);
  }, [library?.id]);

  useEffect(() => {
    if (initialSubpath !== undefined && initialSubpath !== currentSubpath) {
      loadFolder(initialSubpath, false);
    }
  }, [initialSubpath]);

  function handleNavigateUp() {
    if (!currentSubpath) {
      onBackToLibraries();
      return;
    }
    const parts = currentSubpath.split('/').filter(Boolean);
    parts.pop();
    loadFolder(parts.join('/'), true);
  }

  // Current folder display name
  const currentFolderName = data?.breadcrumbs?.length
    ? data.breadcrumbs[data.breadcrumbs.length - 1].name
    : (library?.name || 'Root Folder');

  const totalFolders = data?.folders?.length || 0;
  const totalFiles = data?.files?.length || 0;

  return (
    <div className="space-y-6">
      {/* Explorer Top Navigation & Breadcrumbs Bar */}
      <div className="bg-vault-900 border border-white/10 rounded-2xl p-4 shadow-lg backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Breadcrumb Trail & Up Button */}
          <div className="flex items-center flex-wrap gap-1.5 text-sm">
            <button
              onClick={onBackToLibraries}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition font-medium text-xs border border-white/10"
              title="Return to library list"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>All Libraries</span>
            </button>

            <ChevronRight className="w-4 h-4 text-slate-600" />

            <button
              onClick={() => loadFolder('', true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                !currentSubpath
                  ? 'bg-vault-accent text-white shadow-md shadow-vault-accent/30'
                  : 'text-slate-300 hover:bg-white/10'
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
                    onClick={() => loadFolder(crumb.subpath, true)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition truncate max-w-[180px] ${
                      isLast
                        ? 'bg-vault-accent/20 text-vault-accent border border-vault-accent/40 shadow-sm'
                        : 'text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Quick Actions, View Switcher & Folder Settings */}
          <div className="flex items-center gap-2">
            {/* Configure thumbnail of currently open folder */}
            <button
              onClick={() =>
                setConfigFolder({
                  name: currentFolderName,
                  subpath: currentSubpath,
                })
              }
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white rounded-xl transition"
              title="Folder Poster Configuration"
            >
              <ImageIcon className="w-3.5 h-3.5 text-vault-accent" />
              <span className="hidden sm:inline">Cover Settings</span>
            </button>

            {/* View switcher */}
            <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => handleViewModeChange('grid')}
                className={`p-1.5 rounded-lg transition ${
                  folderViewMode === 'grid'
                    ? 'bg-vault-accent text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Grid View (Folder Cards)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleViewModeChange('compact')}
                className={`p-1.5 rounded-lg transition ${
                  folderViewMode === 'compact'
                    ? 'bg-vault-accent text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Compact List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleViewModeChange('details')}
                className={`p-1.5 rounded-lg transition ${
                  folderViewMode === 'details'
                    ? 'bg-vault-accent text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Details Table"
              >
                <Table className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => loadFolder(currentSubpath, false)}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white bg-white/5 border border-white/10 hover:border-white/20 rounded-xl transition disabled:opacity-50"
              title="Refresh Folder"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-vault-accent' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-vault-accent animate-spin mb-3" />
          <p className="text-sm text-slate-400">Loading folder contents...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
          <p className="text-red-400 font-medium mb-3 text-sm">{error}</p>
          <button
            onClick={() => loadFolder('', true)}
            className="px-4 py-2 bg-vault-800 hover:bg-vault-700 text-white rounded-xl text-xs font-medium transition"
          >
            Back to Library Root
          </button>
        </div>
      )}

      {/* Content View: Strict Folders First Hierarchy */}
      {!loading && !error && data && (
        <div className="space-y-8">
          {/* ================= MODE 1: GRID VIEW ================= */}
          {folderViewMode === 'grid' && (
            <div className="space-y-8">
              {/* 1. Subfolders FIRST */}
              {data.folders.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 px-1">
                      <FolderOpen className="w-4 h-4 text-vault-accent" />
                      <span>Folders ({data.folders.length})</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {data.folders.map((folder) => (
                      <div
                        key={folder.subpath}
                        onClick={() => loadFolder(folder.subpath, true)}
                        className="group flex flex-col cursor-pointer text-left transition-all"
                      >
                        <div className="aspect-[16/10] w-full bg-vault-900 border border-white/10 group-hover:border-vault-accent/60 rounded-xl relative overflow-hidden flex items-center justify-center shadow-md group-hover:shadow-xl transition-all duration-300">
                          {folder.posterUrl ? (
                            <img
                              src={appendAuthToken(folder.posterUrl)}
                              alt={folder.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-[#0b0e14] via-[#141922] to-[#1a2332]">
                              <Folder className="w-12 h-12 text-slate-500 group-hover:text-vault-accent group-hover:scale-110 transition duration-300" />
                            </div>
                          )}

                          {/* Folder Icon Badge */}
                          <div className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-vault-accent">
                            <Folder className="w-3.5 h-3.5" />
                          </div>

                          {/* Quick Edit Thumbnail Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfigFolder(folder);
                            }}
                            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-vault-accent text-slate-300 hover:text-white border border-white/10 backdrop-blur-md transition shadow opacity-0 group-hover:opacity-100"
                            title="Configure Folder Cover"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>

                          {folder.childCount > 0 && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono text-slate-300">
                              {folder.childCount} items
                            </div>
                          )}
                        </div>

                        <div className="mt-2.5 px-0.5">
                          <span
                            className="text-sm font-semibold text-slate-200 group-hover:text-vault-accent truncate block transition"
                            title={folder.name}
                          >
                            {folder.name}
                          </span>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {folder.hasVideos ? 'Media Collection' : 'Directory'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Video Files SECOND */}
              {data.files.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 px-1">
                      <Film className="w-4 h-4 text-rose-400" />
                      <span>Videos & Files ({data.files.length})</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {data.files.map((file) => {
                      const hasAss = file.subtitles?.some(
                        (s) => s.format === 'ass' || s.format === 'ssa'
                      );
                      return (
                        <div
                          key={file.id}
                          onClick={() => onSelectVideo(file)}
                          className="group flex flex-col cursor-pointer text-left transition-all"
                        >
                          <div className="relative w-full rounded-xl overflow-hidden bg-vault-900 border border-white/10 group-hover:border-vault-accent/60 aspect-video shadow-md group-hover:shadow-xl transition-all duration-300">
                            <VideoThumbnail
                              streamUrl={file.streamUrl}
                              posterUrl={file.posterUrl}
                              thumbnailUrl={file.thumbnailUrl}
                              alt={file.title || file.filename}
                              aspectRatio="aspect-video"
                            />
                          </div>

                          <div className="mt-2.5 px-0.5">
                            <h4
                              className="text-sm font-semibold text-slate-200 group-hover:text-vault-accent line-clamp-1 transition mb-0.5"
                              title={file.filename}
                            >
                              {file.title || file.filename}
                            </h4>

                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-white/5 border border-white/10 text-slate-300">
                                {file.extension.toUpperCase().replace('.', '')}
                              </span>
                              <span>&bull;</span>
                              <span className="font-mono text-slate-400">{file.sizeFormatted}</span>
                              {hasAss && (
                                <>
                                  <span>&bull;</span>
                                  <span className="px-1 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[9px] font-bold">
                                    ASS Subtitles
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= MODE 2: COMPACT LIST VIEW ================= */}
          {folderViewMode === 'compact' && (
            <div className="space-y-6">
              {/* Folders List FIRST */}
              {data.folders.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 px-1">
                    <FolderOpen className="w-3.5 h-3.5 text-vault-accent" />
                    <span>Folders ({data.folders.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {data.folders.map((folder) => (
                      <div
                        key={folder.subpath}
                        onClick={() => loadFolder(folder.subpath, true)}
                        className="group flex items-center justify-between p-3 bg-vault-900/80 hover:bg-vault-850 border border-white/10 hover:border-vault-accent/50 rounded-xl cursor-pointer transition shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-lg bg-vault-950 border border-white/10 flex items-center justify-center shrink-0 text-vault-accent group-hover:scale-105 transition-transform overflow-hidden">
                            {folder.posterUrl ? (
                              <img
                                src={appendAuthToken(folder.posterUrl)}
                                alt={folder.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Folder className="w-6 h-6 text-slate-400 group-hover:text-vault-accent" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-white group-hover:text-vault-accent transition truncate">
                              {folder.name}
                            </h4>
                            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                              <span className="text-vault-accent font-medium">Directory</span>
                              <span>&bull;</span>
                              <span className="font-mono">{folder.childCount} items</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfigFolder(folder);
                            }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition"
                            title="Cover Settings"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 py-1.5 bg-vault-accent/20 text-vault-accent group-hover:bg-vault-accent group-hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1">
                            <span>Open</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Video Files List SECOND */}
              {data.files.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 px-1">
                    <Film className="w-3.5 h-3.5 text-rose-400" />
                    <span>Videos ({data.files.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {data.files.map((file) => {
                      const hasAss = file.subtitles?.some(
                        (s) => s.format === 'ass' || s.format === 'ssa'
                      );
                      return (
                        <div
                          key={file.id}
                          onClick={() => onSelectVideo(file)}
                          className="group flex items-center justify-between p-3 bg-vault-900/80 hover:bg-vault-850 border border-white/10 hover:border-vault-accent/50 rounded-xl cursor-pointer transition shadow-sm"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-20 aspect-video rounded-lg overflow-hidden bg-vault-950 border border-white/10 shrink-0">
                              <VideoThumbnail
                                streamUrl={file.streamUrl}
                                posterUrl={file.posterUrl}
                                thumbnailUrl={file.thumbnailUrl}
                                alt={file.title || file.filename}
                                aspectRatio="aspect-video"
                                showPlayIcon={false}
                              />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold text-white group-hover:text-vault-accent transition truncate mb-0.5">
                                {file.title || file.filename}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span className="font-mono text-[10px] uppercase font-bold bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-slate-300">
                                  {file.extension.replace('.', '')}
                                </span>
                                <span className="font-mono">{file.sizeFormatted}</span>
                                <span>&bull;</span>
                                <span>{formatTimeAgo(file.modifiedAt)}</span>
                                {hasAss && (
                                  <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[9px] font-bold">
                                    ASS Subs
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectVideo(file);
                            }}
                            className="px-3.5 py-1.5 bg-vault-accent hover:bg-vault-accent-hover text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ml-3 shadow-sm shadow-vault-accent/20"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Play</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= MODE 3: DETAILS TABLE VIEW ================= */}
          {folderViewMode === 'details' && (
            <div className="bg-vault-900/60 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-white/5 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="py-3.5 px-5">Name</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Size / Items</th>
                      <th className="py-3.5 px-4">Modified</th>
                      <th className="py-3.5 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {/* Folders in table FIRST */}
                    {data.folders.map((folder) => (
                      <tr
                        key={folder.subpath}
                        onClick={() => loadFolder(folder.subpath, true)}
                        className="hover:bg-white/5 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-vault-950 border border-white/10 flex items-center justify-center shrink-0 text-vault-accent group-hover:scale-105 transition-transform">
                              <Folder className="w-4 h-4 fill-vault-accent/20 text-vault-accent" />
                            </div>
                            <span className="font-semibold text-white group-hover:text-vault-accent transition truncate max-w-sm">
                              {folder.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-vault-accent/20 text-vault-accent border border-vault-accent/30">
                            Folder
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-xs text-slate-300">
                          {folder.childCount} items
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-400">
                          Directory
                        </td>
                        <td className="py-3 px-5 whitespace-nowrap text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              loadFolder(folder.subpath, true);
                            }}
                            className="px-3 py-1 bg-vault-accent/20 hover:bg-vault-accent text-vault-accent hover:text-white rounded-lg font-semibold transition text-xs inline-flex items-center gap-1"
                          >
                            <span>Open</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Files in table SECOND */}
                    {data.files.map((file) => {
                      const hasAss = file.subtitles?.some(
                        (s) => s.format === 'ass' || s.format === 'ssa'
                      );
                      return (
                        <tr
                          key={file.id}
                          onClick={() => onSelectVideo(file)}
                          className="hover:bg-white/5 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-vault-950 border border-white/10 flex items-center justify-center shrink-0 text-slate-400 group-hover:text-vault-accent">
                                <FileVideo className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-white group-hover:text-vault-accent transition truncate max-w-sm">
                                  {file.title || file.filename}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono truncate">
                                  {file.filename}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-white/5 text-slate-300 border border-white/10">
                              {file.extension.replace('.', '')} Video
                            </span>
                            {hasAss && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                ASS
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-mono text-xs text-slate-300">
                            {file.sizeFormatted}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-400">
                            {formatTimeAgo(file.modifiedAt)}
                          </td>
                          <td className="py-3 px-5 whitespace-nowrap text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectVideo(file);
                              }}
                              className="px-3 py-1 bg-vault-accent hover:bg-vault-accent-hover text-white rounded-lg font-semibold transition text-xs inline-flex items-center gap-1 shadow-sm shadow-vault-accent/20"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Play</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty Folder State */}
          {totalFolders === 0 && totalFiles === 0 && (
            <div className="py-24 flex flex-col items-center justify-center text-center px-4">
              <FolderOpen className="w-14 h-14 text-white/20 mb-3" />
              <h4 className="text-base font-bold text-slate-300">This folder is empty</h4>
              <p className="text-xs text-slate-500 mt-1">
                No subdirectories or compatible media files found here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Folder Thumbnail Configuration Modal */}
      {configFolder && (
        <FolderThumbModal
          folder={configFolder}
          libraryId={library?.id}
          isOpen={true}
          onClose={() => setConfigFolder(null)}
          onSuccess={() => {
            setConfigFolder(null);
            loadFolder(currentSubpath, false);
          }}
        />
      )}
    </div>
  );
}
