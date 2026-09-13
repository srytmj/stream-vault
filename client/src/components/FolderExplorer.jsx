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
} from 'lucide-react';
import { browseLibraryFolder } from '../utils/api';
import { formatTimeAgo } from '../utils/formatters';
import VideoThumbnail from './VideoThumbnail';

export default function FolderExplorer({
  library,
  onSelectVideo,
  onBackToLibraries,
}) {
  const [currentSubpath, setCurrentSubpath] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [folderViewMode, setFolderViewMode] = useState(() => {
    return localStorage.getItem('sv_folder_view_mode') || 'grid';
  });

  const handleViewModeChange = (mode) => {
    setFolderViewMode(mode);
    localStorage.setItem('sv_folder_view_mode', mode);
  };

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
                  ? 'bg-vault-accent text-white shadow'
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

          {/* Quick Actions & View Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-vault-950 p-1 rounded-xl border border-vault-800 text-xs">
              <button
                onClick={() => handleViewModeChange('grid')}
                className={`p-1.5 rounded-lg transition ${
                  folderViewMode === 'grid'
                    ? 'bg-vault-800 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Thumbnail Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleViewModeChange('compact')}
                className={`p-1.5 rounded-lg transition ${
                  folderViewMode === 'compact'
                    ? 'bg-vault-800 text-white shadow'
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
                    ? 'bg-vault-800 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Details Table View"
              >
                <Table className="w-4 h-4" />
              </button>
            </div>

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
          <p className="text-sm text-slate-400">Membaca isi direktori harddisk & thumbnail...</p>
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
          {/* Subfolders Section with Visual Poster Cards */}
          {data.folders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3.5">
                <FolderOpen className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Direktori & Folder ({data.folders.length})
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                {data.folders.map((folder) => (
                  <button
                    key={folder.subpath}
                    onClick={() => loadFolder(folder.subpath)}
                    className="group relative flex flex-col bg-vault-900 border border-vault-800 hover:border-amber-400/60 rounded-2xl text-left transition hover:scale-[1.02] shadow-sm hover:shadow-xl overflow-hidden"
                  >
                    {/* Folder Artwork or Icon Banner */}
                    <div className="aspect-[16/10] w-full bg-vault-950 relative overflow-hidden flex items-center justify-center">
                      {folder.posterUrl ? (
                        <img
                          src={folder.posterUrl}
                          alt={folder.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-vault-950 via-vault-900 to-vault-850">
                          <Folder className="w-12 h-12 text-amber-400/40 group-hover:scale-110 transition" />
                        </div>
                      )}

                      {/* Folder Icon Overlay Badge */}
                      <div className="absolute top-2 left-2 p-1.5 rounded-lg bg-vault-950/80 backdrop-blur-md border border-vault-700 text-amber-400">
                        <Folder className="w-4 h-4 fill-amber-400/30" />
                      </div>

                      {folder.childCount > 0 && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-vault-950/80 backdrop-blur-md border border-vault-700 text-[10px] font-mono font-bold text-slate-300">
                          {folder.childCount} item
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-amber-400 truncate block transition" title={folder.name}>
                        {folder.name}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        {folder.hasVideos ? 'Koleksi Video' : 'Folder Kosong'}
                      </span>
                    </div>
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
                  Thumbnail Visual Otomatis • Zero Transcode
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
                        className="group flex flex-col bg-vault-900 border border-vault-800 hover:border-vault-accent/50 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow-xl overflow-hidden"
                      >
                        {/* 16:9 Visual Video Thumbnail */}
                        <VideoThumbnail
                          streamUrl={file.streamUrl}
                          posterUrl={file.posterUrl}
                          alt={file.title || file.filename}
                          aspectRatio="aspect-video"
                        />

                        {/* Video Metadata Card Body */}
                        <div className="p-3.5 flex flex-col flex-1">
                          <h4
                            className="text-xs font-bold text-slate-200 group-hover:text-vault-accent line-clamp-1 transition mb-1"
                            title={file.filename}
                          >
                            {file.title || file.filename}
                          </h4>

                          <p className="text-[11px] font-mono text-slate-500 truncate mb-3">
                            {file.filename}
                          </p>

                          <div className="mt-auto flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-vault-800/80">
                            <span className="px-1.5 py-0.5 bg-vault-950 rounded border border-vault-800 font-mono text-[10px] text-vault-accent font-bold">
                              {file.extension.toUpperCase().replace('.', '')}
                            </span>
                            <span className="flex items-center gap-1 font-mono text-[10px]">
                              <HardDrive className="w-3 h-3 text-slate-500" />
                              {file.sizeFormatted}
                            </span>
                            {hasAss && (
                              <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded text-[9px] font-bold">
                                ASS
                              </span>
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
                        className="group flex items-center gap-3 p-3 bg-vault-900/90 hover:bg-vault-850 border border-vault-800 hover:border-vault-accent/40 rounded-xl cursor-pointer transition shadow-sm hover:shadow-lg"
                      >
                        <div className="w-24 aspect-video rounded-lg overflow-hidden flex-shrink-0">
                          <VideoThumbnail
                            streamUrl={file.streamUrl}
                            posterUrl={file.posterUrl}
                            alt={file.title || file.filename}
                            aspectRatio="aspect-video"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4
                            className="text-xs font-bold text-slate-200 group-hover:text-vault-accent line-clamp-1 transition mb-0.5"
                            title={file.filename}
                          >
                            {file.title || file.filename}
                          </h4>
                          <p className="text-[10px] font-mono text-slate-500 truncate mb-1">
                            {file.filename}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
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
                <div className="bg-vault-900 border border-vault-800 rounded-2xl overflow-hidden shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-vault-950/80 border-b border-vault-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                        <tr>
                          <th className="py-3 px-4">Thumbnail</th>
                          <th className="py-3 px-4">Nama File / Judul</th>
                          <th className="py-3 px-4">Format</th>
                          <th className="py-3 px-4">Ukuran</th>
                          <th className="py-3 px-4">Subtitle</th>
                          <th className="py-3 px-4">Dimodifikasi</th>
                          <th className="py-3 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-vault-800/50">
                        {data.files.map((file) => {
                          const hasAss = file.subtitles?.some((s) => s.format === 'ass' || s.format === 'ssa');
                          return (
                            <tr
                              key={file.id}
                              onClick={() => onSelectVideo(file)}
                              className="hover:bg-vault-850/60 cursor-pointer transition group"
                            >
                              <td className="py-2.5 px-4 w-20">
                                <div className="w-16 aspect-video rounded-md overflow-hidden">
                                  <VideoThumbnail
                                    streamUrl={file.streamUrl}
                                    posterUrl={file.posterUrl}
                                    alt={file.title}
                                    aspectRatio="aspect-video"
                                    showPlayIcon={false}
                                  />
                                </div>
                              </td>
                              <td className="py-2.5 px-4 font-semibold text-slate-200 group-hover:text-vault-accent">
                                <div className="line-clamp-1">{file.title || file.filename}</div>
                                <div className="text-[10px] font-mono text-slate-500 line-clamp-1">{file.filename}</div>
                              </td>
                              <td className="py-2.5 px-4 font-mono text-vault-accent font-bold">
                                {file.extension.toUpperCase().replace('.', '')}
                              </td>
                              <td className="py-2.5 px-4 font-mono text-slate-400">
                                {file.sizeFormatted}
                              </td>
                              <td className="py-2.5 px-4">
                                {hasAss ? (
                                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded text-[10px] font-bold">
                                    ASS STYLED
                                  </span>
                                ) : file.subtitles?.length > 0 ? (
                                  <span className="px-2 py-0.5 bg-vault-800 text-slate-300 rounded text-[10px]">
                                    {file.subtitles.length} Sub
                                  </span>
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-slate-500">
                                {formatTimeAgo(file.modifiedAt)}
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectVideo(file);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-vault-accent text-white font-bold text-xs shadow hover:bg-vault-accent-hover transition"
                                >
                                  Putar
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
            </div>
          )}

          {/* Empty Folder State */}
          {data.folders.length === 0 && data.files.length === 0 && (
            <div className="py-16 text-center bg-vault-900/50 border border-vault-800/60 rounded-2xl">
              <Folder className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 font-medium text-sm">Folder ini tidak memiliki subfolder atau file video.</p>
              <button
                onClick={handleNavigateUp}
                className="mt-4 px-4 py-2 bg-vault-800 hover:bg-vault-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Kembali ke Atas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
