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
  ExternalLink,
  Play,
  Copy,
} from 'lucide-react';
import { getSavedProgress, saveWatchProgress } from '../utils/storage';
import { formatDuration } from '../utils/formatters';
import { fetchSubtitleTracks, appendAuthToken } from '../utils/api';

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
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [videoResolution, setVideoResolution] = useState('Original (Direct Play)');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [videoError, setVideoError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Compute full authenticated streaming URL
  const authenticatedStreamUrl = appendAuthToken(mediaItem?.streamUrl);
  const absoluteStreamUrl =
    typeof window !== 'undefined' && authenticatedStreamUrl
      ? new URL(authenticatedStreamUrl, window.location.origin).href
      : authenticatedStreamUrl;

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
          subUrl: appendAuthToken(subUrl),
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
    if (!containerRef.current || !mediaItem?.streamUrl) return;

    setVideoError(null);
    const saved = getSavedProgress(mediaItem.id);
    const initialTime = saved?.currentTime || 0;
    const finalStreamUrl = appendAuthToken(mediaItem.streamUrl);

    const art = new Artplayer({
      container: containerRef.current,
      url: finalStreamUrl,
      type: mediaItem.extension?.replace('.', '') || 'mp4',
      title: mediaItem.title || mediaItem.filename,
      poster: mediaItem.posterUrl ? appendAuthToken(mediaItem.posterUrl) : '',
      volume: 0.8,
      isLive: false,
      muted: false,
      autoplay: true,
      autoSize: false,
      autoMini: true,
      loop: false,
      flip: true,
      playbackRate: true,
      aspectRatio: true,
      screenshot: true,
      setting: true,
      hotkey: true,
      pip: true,
      fullscreen: true,
      fullscreenWeb: true,
      miniProgressBar: true,
      playsInline: true,
      airplay: true,
      lock: true,
      fastForward: true,
      autoPlayback: true,
      theme: '#6366f1',
      icons: {
        loading: '<div class="vault-loading-spinner"></div>',
      },
      settings: [
        {
          width: 200,
          html: 'Playback Speed',
          tooltip: '1.0x',
          selector: [
            { default: true, html: '1.0x', url: 1.0 },
            { html: '0.75x', url: 0.75 },
            { html: '1.25x', url: 1.25 },
            { html: '1.5x', url: 1.5 },
            { html: '2.0x', url: 2.0 },
          ],
          onSelect: function (item) {
            art.playbackRate = item.url;
            return item.html;
          },
        },
      ],
      customType: {
        mkv: function (video, url) { video.src = url; },
        webm: function (video, url) { video.src = url; },
        mp4: function (video, url) { video.src = url; },
        m4v: function (video, url) { video.src = url; },
        avi: function (video, url) { video.src = url; },
        mov: function (video, url) { video.src = url; },
      },
    });

    artRef.current = art;

    // Controls visibility listener
    art.on('control', (state) => {
      setControlsVisible(state);
    });

    // Handle error events
    const handleError = (err) => {
      console.error('[StreamVault] Playback error encountered:', err);
      setVideoError(
        'The video stream could not be decoded by your browser directly. You can play it using an external player (VLC, Infuse, MPV) or download the file.'
      );
    };

    art.on('error', handleError);
    art.on('video:error', handleError);

    // Custom keyboard shortcuts
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        return;
      }

      switch (e.key) {
        case 'j':
        case 'J':
          e.preventDefault();
          art.seek = Math.max(0, art.currentTime - 10);
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          art.seek = Math.min(art.duration, art.currentTime + 10);
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          setShowSubModal((prev) => !prev);
          break;
        case 'n':
        case 'N':
          if (hasNextEpisode) {
            e.preventDefault();
            onNextEpisode();
          }
          break;
        case 'p':
        case 'P':
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

    // Initial seek & mobile autoplay handling on ready
    art.on('ready', () => {
      // Resume timestamp
      if (initialTime > 5 && initialTime < art.duration - 10) {
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

      // Safe autoplay execution: handle mobile policy
      art.play().catch((playErr) => {
        console.warn('[StreamVault] Autoplay prevented by browser policy:', playErr.message);
        art.notice.show = 'Tap video to begin playback';
      });
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

  const copyDirectStreamLink = () => {
    if (absoluteStreamUrl) {
      navigator.clipboard.writeText(absoluteStreamUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white relative select-none">
      {/* Top Header Controls */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-vault-900/80 hover:bg-vault-800 border border-white/10 text-slate-200 hover:text-white transition backdrop-blur-md text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex flex-col">
            <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight line-clamp-1 max-w-[180px] sm:max-w-md">
              {mediaItem.title}
            </h1>
            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-400">
              <span className="font-mono text-vault-accent">{mediaItem.extension?.toUpperCase()}</span>
              <span>&bull;</span>
              <span>{mediaItem.sizeFormatted}</span>
              {activeSubtitle && (
                <>
                  <span>&bull;</span>
                  <span className="text-amber-400 font-medium">CC: {activeSubtitle.label}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quality & External App / Subtitle Toggles */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quality Indicator Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>{videoResolution}</span>
            <span className="text-[10px] text-emerald-300 font-normal">(Direct Play)</span>
          </div>

          {/* Open in External Player (VLC / Infuse / MPV) */}
          <button
            onClick={() => setShowExternalModal(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-vault-900/80 hover:bg-vault-800 border border-white/10 text-slate-200 hover:text-white transition backdrop-blur-md text-xs font-semibold"
            title="Play in External App (VLC / Infuse / MPV)"
          >
            <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">External App</span>
          </button>

          {seriesEpisodes.length > 0 && (
            <button
              onClick={() => setShowEpisodeDrawer((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-vault-900/80 hover:bg-vault-800 border border-white/10 text-slate-200 hover:text-white transition backdrop-blur-md text-xs font-semibold"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Episodes ({seriesEpisodes.length})</span>
            </button>
          )}

          <button
            onClick={() => setShowSubModal(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-vault-900/80 hover:bg-vault-800 border border-white/10 text-slate-200 hover:text-white transition backdrop-blur-md text-xs font-semibold"
          >
            <Subtitles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Subtitles</span>
          </button>
        </div>
      </div>

      {/* Video Container (Hardware Accelerated Player + JASSUB Canvas) */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
        <div ref={containerRef} className="w-full h-full" />

        {/* Playback Error Overlay */}
        {videoError && (
          <div className="absolute inset-0 z-40 bg-black/90 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-rose-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Direct Browser Playback Error</h2>
            <p className="text-xs text-slate-300 max-w-md mb-6">{videoError}</p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setShowExternalModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-vault-accent hover:bg-vault-accent-hover text-white text-xs font-bold shadow-lg shadow-vault-accent/30 transition"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open in VLC / Infuse</span>
              </button>
              <button
                onClick={copyDirectStreamLink}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-vault-800 hover:bg-vault-700 text-white text-xs font-semibold border border-white/10 transition"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Stream Link'}</span>
              </button>
              <button
                onClick={onBack}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition"
              >
                Go Back
              </button>
            </div>
          </div>
        )}

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
              &#x2715;
            </button>
          </div>
        )}
      </div>

      {/* External Player (Jellyfin Style Quick Action) Modal */}
      {showExternalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowExternalModal(false)}
        >
          <div
            className="bg-vault-900 border border-vault-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-vault-800 bg-vault-950/60">
              <div className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-base text-white">Play in External App</h3>
              </div>
              <button
                onClick={() => setShowExternalModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-vault-800"
              >
                &#x2715;
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-300">
                You can play this video directly in your favorite native player (VLC, Infuse, MPV, Outplayer) on Android, iOS, or PC:
              </p>

              <div className="space-y-2.5">
                {/* VLC Player */}
                <a
                  href={`vlc://${absoluteStreamUrl}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-vault-950 border border-vault-800 hover:border-vault-700 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                      VLC
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white group-hover:text-vault-accent">
                        Open in VLC Player
                      </h4>
                      <p className="text-[11px] text-slate-400">Android, iOS, Windows, Mac, Linux</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
                </a>

                {/* Infuse (iOS / Mac / Apple TV) */}
                <a
                  href={`infuse://open?url=${encodeURIComponent(absoluteStreamUrl)}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-vault-950 border border-vault-800 hover:border-vault-700 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs">
                      INF
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white group-hover:text-vault-accent">
                        Open in Infuse
                      </h4>
                      <p className="text-[11px] text-slate-400">iOS, iPadOS, macOS, Apple TV</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
                </a>

                {/* Android MX / Video Intent */}
                <a
                  href={`intent:${absoluteStreamUrl}#Intent;type=video/*;end`}
                  className="flex items-center justify-between p-3 rounded-xl bg-vault-950 border border-vault-800 hover:border-vault-700 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      AND
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white group-hover:text-vault-accent">
                        Android Default Player / MX Player
                      </h4>
                      <p className="text-[11px] text-slate-400">Android Intent Video Action</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
                </a>

                {/* Copy Direct Link */}
                <button
                  onClick={copyDirectStreamLink}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-vault-950 border border-vault-800 hover:border-vault-700 transition group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                      <Copy className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white group-hover:text-vault-accent">
                        {copiedLink ? 'Link Copied to Clipboard!' : 'Copy Direct Stream URL'}
                      </h4>
                      <p className="text-[11px] text-slate-400">Paste in MPV, PotPlayer, or download</p>
                    </div>
                  </div>
                  {copiedLink && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtitles & Softsubs Selection Modal */}
      {showSubModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowSubModal(false)}
        >
          <div
            className="bg-vault-900 border border-vault-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-vault-800 bg-vault-950/60">
              <div className="flex items-center gap-2">
                <Subtitles className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Select Subtitles & Softsubs</h3>
              </div>
              <button
                onClick={() => setShowSubModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-vault-800"
              >
                &#x2715;
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-slate-400">
                Subtitles render directly onto the HTML5 canvas via <span className="text-vault-accent font-semibold">JASSUB WebAssembly</span> with zero server transcoding.
              </p>

              {/* Subtitle Track List */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Available Subtitle Tracks
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
                  <span>Disable Subtitles (Off)</span>
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
                          {sub.isEmbedded ? 'Internal softsub (MKV container)' : sub.filename}
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
                  Or Load Subtitle from Computer
                </label>
                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-vault-700 hover:border-vault-accent rounded-xl cursor-pointer bg-vault-950 hover:bg-vault-850 transition">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-300 font-medium">Select .ass / .srt / .vtt File</span>
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
            <h3 className="font-bold text-sm text-white">Episode List</h3>
            <button
              onClick={() => setShowEpisodeDrawer(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-vault-800"
            >
              &#x2715;
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
