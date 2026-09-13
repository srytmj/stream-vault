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
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { getSavedProgress, saveWatchProgress } from '../utils/storage';
import { formatDuration } from '../utils/formatters';
import { fetchSubtitleTracks } from '../utils/api';

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
  const [videoResolution, setVideoResolution] = useState('Original (Direct Play)');

  // Initialize and discover subtitle tracks (both external companion & embedded softsub)
  useEffect(() => {
    if (!mediaItem) return;

    const initialSubs = mediaItem.subtitles || [];
    setAvailableSubtitles(initialSubs);

    // Default select first ASS or SRT subtitle if available
    if (initialSubs.length > 0) {
      setActiveSubtitle(initialSubs[0]);
    } else {
      setActiveSubtitle(null);
    }

    // Probe server for embedded softsub tracks in MKV/MP4
    const itemPath = mediaItem.relativePath || mediaItem.subpath || mediaItem.filename;
    if (itemPath) {
      fetchSubtitleTracks(itemPath)
        .then((tracks) => {
          if (Array.isArray(tracks) && tracks.length > 0) {
            setAvailableSubtitles(tracks);
            // If nothing was selected or default found, select
            const def = tracks.find((t) => t.isDefault) || tracks[0];
            if (def) setActiveSubtitle(def);
          }
        })
        .catch(() => {});
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
      theme: '#f47521', // Flame orange
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
          name: 'quality-badge',
          position: 'right',
          html: '<span style="font-size: 11px; font-weight: bold; background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); padding: 2px 6px; border-radius: 4px;">DIRECT PLAY</span>',
          tooltip: 'Zero Transcode: 100% Original Quality Direct Stream',
        },
        {
          name: 'subtitles-btn',
          position: 'right',
          html: `<span style="font-weight: bold; font-size: 13px; padding: 2px 6px; border: 1px solid rgba(255,255,255,0.4); border-radius: 4px;">CC</span>`,
          tooltip: 'Subtitles & ASS Softsubs',
          click: () => {
            setShowSubModal(true);
          },
        },
      ],
    });

    artRef.current = art;

    // Fast keyboard shortcuts handling
    const handleKeyDown = (e) => {
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

      if (art.video?.videoWidth && art.video?.videoHeight) {
        setVideoResolution(`${art.video.videoWidth}x${art.video.videoHeight} Original`);
      }

      // If initial subtitle exists, setup JASSUB
      if (activeSubtitle) {
        setupJassub(art.video, activeSubtitle.url);
      }
    });

    art.on('video:loadedmetadata', () => {
      if (art.video?.videoWidth && art.video?.videoHeight) {
        setVideoResolution(`${art.video.videoWidth}x${art.video.videoHeight} Original`);
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
  }, [mediaItem?.id, mediaItem?.streamUrl]);

  // Update subtitle when activeSubtitle changes
  useEffect(() => {
    if (artRef.current && artRef.current.video && activeSubtitle) {
      setupJassub(artRef.current.video, activeSubtitle.url);
    } else if (!activeSubtitle) {
      destroyJassub();
    }
  }, [activeSubtitle, setupJassub, destroyJassub]);

  // Handle local subtitle file upload (.ass / .srt / .vtt)
  const handleLocalSubUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const subUrl = URL.createObjectURL(file);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'ass';
    const customSub = {
      label: `${file.name} (Local)`,
      lang: 'local',
      format: ext,
      filename: file.name,
      url: subUrl,
      isCustom: true,
    };

    setAvailableSubtitles((prev) => [customSub, ...prev]);
    setActiveSubtitle(customSub);
    setShowSubModal(false);

    if (artRef.current) {
      artRef.current.notice.show = `Loaded subtitle: ${file.name}`;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white relative select-none">
      {/* Top Header Controls */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-vault-900/80 hover:bg-vault-800 border border-white/10 text-slate-200 hover:text-white transition backdrop-blur-md text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>

          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-white tracking-tight line-clamp-1 max-w-md">
              {mediaItem.title}
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="font-mono text-vault-accent">{mediaItem.extension?.toUpperCase()}</span>
              <span>&bull;</span>
              <span>{mediaItem.sizeFormatted}</span>
              {activeSubtitle && (
                <>
                  <span>&bull;</span>
                  <span className="text-amber-400 font-medium">
                    CC: {activeSubtitle.label}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quality & Episode Drawer Toggle */}
        <div className="flex items-center gap-2">
          {/* Quality Indicator Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>{videoResolution}</span>
            <span className="text-[10px] text-emerald-300 font-normal">(CPU 0%)</span>
          </div>

          {seriesEpisodes.length > 0 && (
            <button
              onClick={() => setShowEpisodeDrawer((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-vault-900/80 hover:bg-vault-800 border border-white/10 text-slate-200 hover:text-white transition backdrop-blur-md text-xs font-semibold"
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Episodes ({seriesEpisodes.length})</span>
            </button>
          )}

          <button
            onClick={() => setShowSubModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-vault-900/80 hover:bg-vault-800 border border-white/10 text-slate-200 hover:text-white transition backdrop-blur-md text-xs font-semibold"
          >
            <Subtitles className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Subtitles</span>
          </button>
        </div>
      </div>

      {/* Video Container (Hardware Accelerated Player + JASSUB Canvas) */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
        <div ref={containerRef} className="w-full h-full" />

        {/* Resume Toast Banner */}
        {resumeToast && (
          <div className="absolute bottom-20 left-6 z-30 flex items-center gap-3 p-3.5 bg-vault-900/95 border border-vault-700 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
            <span className="text-xs text-slate-200">{resumeToast.message}</span>
            <button
              onClick={() => {
                if (artRef.current) {
                  artRef.current.seek = 0;
                  setResumeToast(null);
                }
              }}
              className="flex items-center gap-1 text-xs font-bold text-vault-accent hover:text-vault-accent-hover px-2 py-1 bg-vault-800 rounded-lg transition"
            >
              <RotateCcw className="w-3 h-3" />
              Restart 0:00
            </button>
            <button
              onClick={() => setResumeToast(null)}
              className="text-slate-400 hover:text-white text-xs ml-1"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Subtitles & Softsubs Selection Modal */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-vault-900 border border-vault-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-vault-800 bg-vault-950/60">
              <div className="flex items-center gap-2">
                <Subtitles className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Pilih Subtitle & Softsub</h3>
              </div>
              <button
                onClick={() => setShowSubModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-vault-800"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-slate-400">
                Subtitle di-render langsung di HTML5 canvas via <span className="text-vault-accent font-semibold">JASSUB WebAssembly</span> tanpa transcode server.
              </p>

              {/* Subtitle Track List */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Track Subtitle Tersedia
                </label>

                {/* Off Option */}
                <button
                  onClick={() => {
                    setActiveSubtitle(null);
                    setShowSubModal(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition ${
                    activeSubtitle === null
                      ? 'bg-vault-accent/20 border-vault-accent text-vault-accent'
                      : 'bg-vault-950 border-vault-800 text-slate-300 hover:border-vault-700'
                  }`}
                >
                  <span>Nonaktifkan Subtitle (Off)</span>
                  {activeSubtitle === null && <Check className="w-4 h-4" />}
                </button>

                {availableSubtitles.map((sub, idx) => {
                  const isSelected = activeSubtitle && activeSubtitle.url === sub.url;
                  const isAss = sub.format === 'ass' || sub.format === 'ssa';

                  return (
                    <button
                      key={sub.url || idx}
                      onClick={() => {
                        setActiveSubtitle(sub);
                        setShowSubModal(false);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition text-left ${
                        isSelected
                          ? 'bg-vault-accent/20 border-vault-accent text-vault-accent'
                          : 'bg-vault-950 border-vault-800 text-slate-300 hover:border-vault-700'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-200">
                          {sub.label}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {sub.isEmbedded ? 'Softsub internal (MKV container)' : sub.filename}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAss && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                            ASS CANVAS
                          </span>
                        )}
                        {isSelected && <Check className="w-4 h-4 text-vault-accent" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Upload Custom Subtitle File */}
              <div className="pt-3 border-t border-vault-800">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                  Atau Muat Subtitle dari Komputer
                </label>
                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-vault-700 hover:border-vault-accent rounded-xl cursor-pointer bg-vault-950 hover:bg-vault-850 transition">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-300 font-medium">Pilih File .ass / .srt / .vtt</span>
                  <input
                    type="file"
                    accept=".ass,.ssa,.srt,.vtt"
                    onChange={handleLocalSubUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Episode Drawer for Series */}
      {showEpisodeDrawer && seriesEpisodes.length > 0 && (
        <div className="fixed inset-y-0 right-0 z-40 w-80 bg-vault-950 border-l border-vault-800 shadow-2xl p-4 overflow-y-auto animate-in slide-in-from-right">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-vault-800">
            <h3 className="font-bold text-sm text-white">Daftar Episode</h3>
            <button
              onClick={() => setShowEpisodeDrawer(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-vault-800"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            {seriesEpisodes.map((ep) => {
              const isCurrent = ep.id === mediaItem.id;
              return (
                <button
                  key={ep.id}
                  onClick={() => {
                    onSelectEpisode?.(ep);
                    setShowEpisodeDrawer(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs text-left transition ${
                    isCurrent
                      ? 'bg-vault-accent/20 border-vault-accent text-vault-accent font-bold'
                      : 'bg-vault-900 border-vault-800 text-slate-300 hover:bg-vault-850'
                  }`}
                >
                  <span className="truncate pr-2">{ep.title}</span>
                  <span className="text-[10px] font-mono text-slate-500">{ep.sizeFormatted}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
