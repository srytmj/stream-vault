import React, { useEffect, useRef, useState, useCallback } from 'react';
import Artplayer from 'artplayer';
import JASSUB from 'jassub';
import {
  ArrowLeft,
  SkipForward,
  SkipBack,
  Subtitles,
  Upload,
  Settings,
  RotateCcw,
  Check,
  AlertCircle,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { getSavedProgress, saveWatchProgress } from '../utils/storage';
import { formatDuration } from '../utils/formatters';

export default function VideoPlayer({
  mediaItem,
  onBack,
  onNextEpisode,
  onPrevEpisode,
  hasNextEpisode,
  hasPrevEpisode,
  seriesEpisodes = [],
  onSelectEpisode,
}) {
  const containerRef = useRef(null);
  const artRef = useRef(null);
  const jassubRef = useRef(null);

  const [activeSubtitle, setActiveSubtitle] = useState(null);
  const [availableSubtitles, setAvailableSubtitles] = useState([]);
  const [resumeToast, setResumeToast] = useState(null);
  const [jassubStatus, setJassubStatus] = useState('ready');
  const [showSubModal, setShowSubModal] = useState(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);

  // Initialize subtitle list from media item
  useEffect(() => {
    if (!mediaItem) return;

    const subs = mediaItem.subtitles || [];
    setAvailableSubtitles(subs);

    // Default select first ASS or SRT subtitle if available
    if (subs.length > 0) {
      setActiveSubtitle(subs[0]);
    } else {
      setActiveSubtitle(null);
    }
  }, [mediaItem]);

  // Clean up JASSUB instance
  const destroyJassub = useCallback(() => {
    if (jassubRef.current) {
      try {
        jassubRef.current.destroy();
      } catch (err) {
        console.warn('JASSUB cleanup warning:', err);
      }
      jassubRef.current = null;
    }
  }, []);

  // Initialize or update JASSUB subtitle renderer
  const setupJassub = useCallback(
    (videoEl, subUrl) => {
      destroyJassub();
      if (!subUrl || !videoEl) return;

      try {
        setJassubStatus('loading');
        jassubRef.current = new JASSUB({
          video: videoEl,
          subUrl: subUrl,
          workerUrl: '/jassub/jassub-worker.js',
          wasmUrl: '/jassub/jassub-worker.wasm',
          defaultFont: '/jassub/default.woff2',
          blendMode: 'js',
          asyncRender: true,
          offscreenRender: true,
          onDemandRender: true,
          fallbackFont: 'sans-serif',
        });

        setJassubStatus('active');
      } catch (err) {
        console.error('Failed to initialize JASSUB canvas renderer:', err);
        setJassubStatus('error');
      }
    },
    [destroyJassub]
  );

  // Initialize Artplayer
  useEffect(() => {
    if (!containerRef.current || !mediaItem) return;

    // Check saved progress
    const saved = getSavedProgress(mediaItem.id);
    const initialTime = saved && saved.currentTime > 5 && !saved.completed ? saved.currentTime : 0;

    const art = new Artplayer({
      container: containerRef.current,
      url: mediaItem.streamUrl,
      title: mediaItem.title,
      type: mediaItem.extension?.replace('.', '') || 'mp4',
      theme: '#f47521', // Crunchyroll flame orange
      autoplay: true,
      autoMini: true,
      playbackRate: true,
      aspectRatio: true,
      setting: true,
      hotkey: true,
      pip: true,
      fullscreen: true,
      fullscreenWeb: true,
      miniProgressBar: true,
      playsInline: true,
      autoOrientation: true,
      lock: true,
      fastForward: true,
      moreVideoAttr: {
        crossOrigin: 'anonymous',
        playsInline: true,
        'webkit-playsinline': true,
      },
      icons: {
        loading: '<div class="w-10 h-10 border-4 border-vault-accent border-t-transparent rounded-full animate-spin"></div>',
      },
      controls: [
        {
          name: 'subtitles-btn',
          position: 'right',
          html: `<span style="font-weight: bold; font-size: 13px; padding: 2px 6px; border: 1px solid rgba(255,255,255,0.4); border-radius: 4px;">CC</span>`,
          tooltip: 'Subtitles / ASS Renderer',
          click: () => {
            setShowSubModal(true);
          },
        },
      ],
    });

    artRef.current = art;

    // Fast keyboard shortcuts handling
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      const video = art.video;
      if (!video) return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          art.toggle();
          break;
        case 'j':
          e.preventDefault();
          art.seek = Math.max(0, art.currentTime - 10);
          art.notice.show = `-10s (${formatDuration(art.currentTime)})`;
          break;
        case 'l':
          e.preventDefault();
          art.seek = Math.min(art.duration, art.currentTime + 10);
          art.notice.show = `+10s (${formatDuration(art.currentTime)})`;
          break;
        case 'arrowleft':
          e.preventDefault();
          art.seek = Math.max(0, art.currentTime - 5);
          art.notice.show = `-5s (${formatDuration(art.currentTime)})`;
          break;
        case 'arrowright':
          e.preventDefault();
          art.seek = Math.min(art.duration, art.currentTime + 5);
          art.notice.show = `+5s (${formatDuration(art.currentTime)})`;
          break;
        case 'm':
          e.preventDefault();
          art.muted = !art.muted;
          art.notice.show = art.muted ? 'Muted' : 'Unmuted';
          break;
        case 'f':
          e.preventDefault();
          art.fullscreen = !art.fullscreen;
          break;
        case 'c':
          e.preventDefault();
          setShowSubModal((prev) => !prev);
          break;
        case 'n':
          if (hasNextEpisode) {
            e.preventDefault();
            onNextEpisode();
          }
          break;
        case 'p':
          if (hasPrevEpisode) {
            e.preventDefault();
            onPrevEpisode();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Video events
    art.on('ready', () => {
      if (initialTime > 0) {
        art.seek = initialTime;
        setResumeToast({
          time: initialTime,
          message: `Resumed from ${formatDuration(initialTime)}`,
        });
      }

      // If initial subtitle exists, setup JASSUB
      if (activeSubtitle) {
        setupJassub(art.video, activeSubtitle.url);
      }
    });

    // Auto-save watch progress periodically
    let lastSave = 0;
    art.on('video:timeupdate', () => {
      const now = Date.now();
      if (now - lastSave > 2500) {
        lastSave = now;
        saveWatchProgress(mediaItem, art.currentTime, art.duration);
      }
    });

    art.on('video:ended', () => {
      saveWatchProgress(mediaItem, art.duration, art.duration);
      if (hasNextEpisode) {
        art.notice.show = 'Playing next episode in 3 seconds...';
        setTimeout(() => {
          onNextEpisode();
        }, 3000);
      }
    });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      destroyJassub();
      if (art && art.destroy) {
        art.destroy(false);
      }
    };
  }, [mediaItem?.id]); // re-run only when media ID changes

  // Update JASSUB when activeSubtitle changes
  const handleSelectSubtitle = (sub) => {
    setActiveSubtitle(sub);
    setShowSubModal(false);

    if (!artRef.current || !artRef.current.video) return;

    if (!sub) {
      destroyJassub();
      setJassubStatus('off');
      artRef.current.notice.show = 'Subtitles Off';
    } else {
      setupJassub(artRef.current.video, sub.url);
      artRef.current.notice.show = `Subtitles: ${sub.label}`;
    }
  };

  // Custom subtitle file upload (.ass, .srt)
  const handleCustomSubtitleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const customSub = {
      label: `Custom: ${file.name}`,
      lang: 'custom',
      format: file.name.endsWith('.ass') ? 'ass' : 'srt',
      filename: file.name,
      url: objectUrl,
      isCustom: true,
    };

    setAvailableSubtitles((prev) => [customSub, ...prev]);
    handleSelectSubtitle(customSub);
  };

  const restartFromBeginning = () => {
    if (artRef.current) {
      artRef.current.seek = 0;
      setResumeToast(null);
      artRef.current.notice.show = 'Restarted from beginning';
    }
  };

  return (
    <div className="relative flex flex-col bg-vault-950 min-h-[calc(100vh-65px)]">
      {/* Top action bar */}
      <div className="flex items-center justify-between px-4 lg:px-8 py-3 bg-vault-900/60 border-b border-vault-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vault-800 hover:bg-vault-700 text-slate-200 text-xs font-medium transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Library</span>
          </button>

          <div>
            <h1 className="text-sm md:text-base font-bold text-white tracking-tight line-clamp-1">
              {mediaItem.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-vault-accent font-semibold uppercase">{mediaItem.category}</span>
              <span>•</span>
              <span>{mediaItem.extension?.toUpperCase()}</span>
              <span>•</span>
              <span>{mediaItem.sizeFormatted}</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">Direct Range Stream</span>
            </div>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2">
          {hasPrevEpisode && (
            <button
              onClick={onPrevEpisode}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-vault-850 hover:bg-vault-800 text-slate-200 text-xs font-medium transition-all border border-vault-700"
              title="Previous Episode (P)"
            >
              <SkipBack className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </button>
          )}

          {hasNextEpisode && (
            <button
              onClick={onNextEpisode}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-vault-accent hover:bg-vault-accentHover text-white text-xs font-medium transition-all shadow-md shadow-vault-accent/20"
              title="Next Episode (N)"
            >
              <span className="hidden sm:inline">Next</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          )}

          {seriesEpisodes.length > 1 && (
            <button
              onClick={() => setShowEpisodeDrawer((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vault-850 hover:bg-vault-800 text-slate-200 text-xs font-medium transition-all border border-vault-700"
              title="View all episodes"
            >
              <Layers className="w-3.5 h-3.5 text-vault-accent" />
              <span className="hidden sm:inline">Episodes ({seriesEpisodes.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main player layout */}
      <div className="relative flex-1 flex flex-col lg:flex-row">
        {/* Player Container */}
        <div className="flex-1 flex flex-col items-center justify-center bg-black/60 p-2 sm:p-4 lg:p-6">
          <div className="relative w-full max-w-6xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-vault-800">
            <div ref={containerRef} className="w-full h-full" />

            {/* Resume Playback Toast */}
            {resumeToast && (
              <div className="absolute top-4 left-4 z-30 flex items-center gap-3 bg-vault-900/95 border border-vault-700 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-xl animate-fade-in text-xs text-white">
                <Sparkles className="w-4 h-4 text-vault-accent animate-pulse" />
                <span>{resumeToast.message}</span>
                <button
                  onClick={restartFromBeginning}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-vault-800 hover:bg-vault-700 text-vault-accent font-semibold transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restart</span>
                </button>
                <button
                  onClick={() => setResumeToast(null)}
                  className="text-slate-400 hover:text-white ml-1 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Subtitle status badge overlay */}
            <div className="absolute top-4 right-4 z-20 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-[11px]">
              <div
                className={`w-2 h-2 rounded-full ${
                  activeSubtitle ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <span className="text-slate-300 font-medium">
                {activeSubtitle ? `ASS Canvas: ${activeSubtitle.label}` : 'Subtitles: Off'}
              </span>
            </div>
          </div>

          {/* Quick Player Bar Info */}
          <div className="w-full max-w-6xl mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400 bg-vault-900/40 p-3 rounded-xl border border-vault-800/60">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-200">Hardware Acceleration:</span>
              <span className="text-emerald-400 font-medium">Active (Client Decoded)</span>
              <span className="text-slate-600">|</span>
              <span className="font-semibold text-slate-200">Server CPU:</span>
              <span className="text-emerald-400 font-medium">0% (Pure Range Server)</span>
              <span className="text-slate-600">|</span>
              <span className="font-semibold text-slate-200">Subtitle Engine:</span>
              <span className="text-amber-400 font-medium">JASSUB WebAssembly (libass)</span>
            </div>

            <button
              onClick={() => setShowSubModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-vault-850 hover:bg-vault-800 text-slate-200 font-medium border border-vault-700 transition-all"
            >
              <Subtitles className="w-3.5 h-3.5 text-vault-accent" />
              <span>Configure Subtitles</span>
            </button>
          </div>
        </div>

        {/* Optional Episode Drawer for Series */}
        {showEpisodeDrawer && seriesEpisodes.length > 0 && (
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-vault-800 bg-vault-900/70 p-4 overflow-y-auto max-h-[500px] lg:max-h-none">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-vault-accent" />
                Episodes ({seriesEpisodes.length})
              </h3>
              <button
                onClick={() => setShowEpisodeDrawer(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              {seriesEpisodes.map((ep, idx) => {
                const isCurrent = ep.id === mediaItem.id;
                return (
                  <button
                    key={ep.id}
                    onClick={() => {
                      onSelectEpisode(ep);
                      setShowEpisodeDrawer(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                      isCurrent
                        ? 'bg-vault-accent/15 border-vault-accent/50 text-white font-semibold'
                        : 'bg-vault-850/60 border-vault-800/80 text-slate-300 hover:bg-vault-800 hover:border-vault-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-slate-500 w-5">
                        {ep.episode !== null ? ep.episode : idx + 1}
                      </span>
                      <span className="text-xs truncate">{ep.title}</span>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-vault-accent text-white font-bold shrink-0">
                        PLAYING
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Subtitles & Styling Modal */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-vault-900 border border-vault-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-vault-800">
              <div className="flex items-center gap-2">
                <Subtitles className="w-5 h-5 text-vault-accent" />
                <h3 className="font-bold text-base text-white">Client-Side Subtitles (ASS/SRT)</h3>
              </div>
              <button
                onClick={() => setShowSubModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                StreamVault renders anime styled <span className="text-amber-400 font-semibold">.ass</span> subtitles
                directly on your browser canvas using WebAssembly libass (JASSUB), with full typesetting, karaoke, and custom fonts.
              </p>

              {/* Subtitle list */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Available Tracks</label>

                {/* Off Option */}
                <button
                  onClick={() => handleSelectSubtitle(null)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                    activeSubtitle === null
                      ? 'bg-vault-accent text-white border-vault-accent font-semibold'
                      : 'bg-vault-850 text-slate-300 border-vault-800 hover:bg-vault-800'
                  }`}
                >
                  <span>Disable Subtitles</span>
                  {activeSubtitle === null && <Check className="w-4 h-4" />}
                </button>

                {/* Detected Tracks */}
                {availableSubtitles.map((sub, i) => {
                  const isSelected = activeSubtitle?.url === sub.url;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelectSubtitle(sub)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-vault-accent text-white border-vault-accent font-semibold shadow-md shadow-vault-accent/20'
                          : 'bg-vault-850 text-slate-300 border-vault-800 hover:bg-vault-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-black/40 text-[10px] font-mono uppercase">
                          {sub.format}
                        </span>
                        <span>{sub.label}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4" />}
                    </button>
                  );
                })}

                {availableSubtitles.length === 0 && (
                  <div className="p-3 rounded-xl bg-vault-850 border border-vault-800 text-xs text-slate-400 text-center">
                    No external companion subtitle file detected in folder.
                  </div>
                )}
              </div>

              {/* Upload custom subtitle file */}
              <div className="pt-2 border-t border-vault-800">
                <label className="text-xs font-semibold text-slate-300 block mb-2">
                  Load Local Subtitle File (.ass / .srt)
                </label>
                <label className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-dashed border-vault-700 bg-vault-850 hover:bg-vault-800 text-slate-300 hover:text-white cursor-pointer transition-all text-xs font-medium">
                  <Upload className="w-4 h-4 text-vault-accent" />
                  <span>Choose file from hard drive</span>
                  <input
                    type="file"
                    accept=".ass,.ssa,.srt,.vtt"
                    onChange={handleCustomSubtitleUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-vault-800 flex justify-end">
              <button
                onClick={() => setShowSubModal(false)}
                className="px-4 py-2 rounded-xl bg-vault-800 hover:bg-vault-700 text-xs font-semibold text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
