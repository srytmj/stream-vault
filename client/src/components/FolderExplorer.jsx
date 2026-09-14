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
  Grid,
  List,
  Table,
  Image as ImageIcon,
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

  return (
    <div className="space-y-6">
      {/* Explorer Top Navigation & Breadcrumbs Bar */}
      <div className="bg-vault-900 border border-white/10 rounded-2xl p-4 shadow-lg backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Breadcrumb Trail */}
          <div className="flex items-center flex-wrap gap-1.5 text-sm">
            <button
              onClick={onBackToLibraries}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition font-medium text-xs border border-white/10"
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
                    ? 'bg-white/15 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleViewModeChange('compact')}
                className={`p-1.5 rounded-lg transition ${
                  folderViewMode === 'compact'
                    ? 'bg-white/15 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleViewModeChange('details')}
                className={`p-1.5 rounded-lg transition ${
                  folderViewMode === 'details'
                    ? 'bg-white/15 text-white shadow'
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

      {/* Content View */}
      {!loading && !error && data && (
        <div className="space-y-8">
          {/* Subfolders Section */}
          {data.folders.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-vault-accent" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Folders ({data.folders.length})
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {data.folders.map((folder) => (
                  <div
                    key={folder.subpath}
                    onClick={() => loadFolder(folder.subpath, true)}
                    className="group flex flex-col cursor-pointer text-left transition-all"
                  >
                    {/* Folder Artwork or Modern Folder Graphic */}
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

          {/* Video Files Section */}
          {data.files.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-vault-accent" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Videos & Episodes ({data.files.length})
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  Direct Play
                </span>
              </div>

              {/* View Mode 1: Visual Thumbnail Grid */}
              {folderViewMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {data.files.map((file) => {
                    const hasAss = file.subtitles?.some((s) => s.format === 'ass' || s.format === 'ssa');
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
                            <span>•</span>
                            <span className="font-mono text-slate-400">{file.sizeFormatted}</span>
                            {hasAss && (
                              <>
                                <span>•</span>
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
              )}

              {/* View Mode 2: Compact Cards */}
              {folderViewMode === 'compact' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.files.map((file) => {
                    const hasAss = file.subtitles?.some((s) => s.format === 'ass' || s.format === 'ssa');
                    return (
                      <div
                        key={file.id}
                        onClick={() => onSelectVideo(file)}
                        className="group flex items-center gap-3.5 p-3 bg-vault-900/90 hover:bg-vault-850 border border-white/10 hover:border-vault-accent/50 rounded-xl cursor-pointer transition shadow-sm hover:shadow-lg"
                      >
                        <div className="w-24 aspect-video rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                          <VideoThumbnail
                            streamUrl={file.streamUrl}
                            posterUrl={file.posterUrl}
                            thumbnailUrl={file.thumbnailUrl}
                            alt={file.title || file.filename}
                            aspectRatio="aspect-video"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4
                            className="text-sm font-semibold text-slate-200 group-hover:text-vault-accent line-clamp-1 transition mb-1"
                            title={file.filename}
                          >
                            {file.title || file.filename}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span className="text-vault-accent font-mono font-bold">
                              {file.extension.toUpperCase().replace('.', '')}
                            </span>
                            <span>•</span>
                            <span>{file.sizeFormatted}</span>
                            {hasAss && (
                              <>
                                <span>•</span>
                                <span className="text-purple-400 font-bold">ASS</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* View Mode 3: Details Table */}
              {folderViewMode === 'details' && (
                <div className="bg-vault-900/50 rounded-xl overflow-hidden border border-white/10">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white/5 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Title</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Size</th>
                          <th className="py-3 px-4">Modified</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {data.files.map((file) => (
                          <tr
                            key={file.id}
                            onClick={() => onSelectVideo(file)}
                            className="hover:bg-white/5 transition-colors cursor-pointer group"
                          >
                            <td className="py-2.5 px-4 font-medium text-slate-200 group-hover:text-white truncate max-w-xs">
                              {file.title || file.filename}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-xs text-vault-accent uppercase">
                              {file.extension.replace('.', '')}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-xs text-slate-400">
                              {file.sizeFormatted}
                            </td>
                            <td className="py-2.5 px-4 text-xs text-slate-400">
                              {formatTimeAgo(file.modifiedAt)}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectVideo(file);
                                }}
                                className="px-3 py-1 bg-white/10 hover:bg-vault-accent text-white rounded-lg font-medium transition text-xs"
                              >
                                Play
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {data.folders.length === 0 && data.files.length === 0 && (
            <div className="py-24 text-center">
              <Folder className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">This directory is empty</p>
            </div>
          )}
        </div>
      )}

      {/* Folder Thumbnail Settings Modal */}
      {configFolder && (
        <FolderThumbModal
          folder={configFolder}
          isOpen={Boolean(configFolder)}
          onClose={() => setConfigFolder(null)}
          onUpdated={() => loadFolder(currentSubpath, false)}
        />
      )}
    </div>
  );
}
