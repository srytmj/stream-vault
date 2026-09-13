import React, { useState, useEffect, useRef } from 'react';
import { Film, Play, Sparkles } from 'lucide-react';

// In-memory cache for client-side generated video frame thumbnails
const thumbnailCache = new Map();

export default function VideoThumbnail({
  streamUrl,
  posterUrl,
  alt = 'Video thumbnail',
  className = '',
  aspectRatio = 'aspect-video',
  showPlayIcon = true,
}) {
  const [thumbSrc, setThumbSrc] = useState(() => {
    if (posterUrl) return posterUrl;
    if (streamUrl && thumbnailCache.has(streamUrl)) {
      return thumbnailCache.get(streamUrl);
    }
    return null;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (posterUrl) {
      setThumbSrc(posterUrl);
      return;
    }

    if (!streamUrl) return;

    if (thumbnailCache.has(streamUrl)) {
      setThumbSrc(thumbnailCache.get(streamUrl));
      return;
    }

    // Generate snapshot client-side from initial video chunk
    let isCancelled = false;
    setIsGenerating(true);

    const video = document.createElement('video');
    videoRef.current = video;
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = streamUrl;

    const onLoadedMetadata = () => {
      // Seek to 3 seconds or 10% into video
      const targetTime = Math.min(3, Math.max(0.5, (video.duration || 10) * 0.05));
      video.currentTime = targetTime;
    };

    const onSeeked = () => {
      if (isCancelled) return;
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 480;
        const scale = Math.min(1, maxDim / Math.max(video.videoWidth || 640, video.videoHeight || 360));
        canvas.width = (video.videoWidth || 640) * scale;
        canvas.height = (video.videoHeight || 360) * scale;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          thumbnailCache.set(streamUrl, dataUrl);
          if (!isCancelled) {
            setThumbSrc(dataUrl);
            setIsGenerating(false);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setIsGenerating(false);
          setHasError(true);
        }
      } finally {
        cleanup();
      }
    };

    const onError = () => {
      if (!isCancelled) {
        setIsGenerating(false);
        setHasError(true);
      }
      cleanup();
    };

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      video.src = '';
      video.load();
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);

    // Timeout safeguard (3.5s max to avoid hanging)
    const timer = setTimeout(() => {
      if (isGenerating && !thumbSrc) {
        cleanup();
        if (!isCancelled) setIsGenerating(false);
      }
    }, 3500);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      cleanup();
    };
  }, [streamUrl, posterUrl]);

  return (
    <div className={`relative overflow-hidden bg-vault-900 flex items-center justify-center group ${aspectRatio} ${className}`}>
      {thumbSrc && !hasError ? (
        <img
          src={thumbSrc}
          alt={alt}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      ) : (
        /* Dynamic Placeholder when no artwork is present */
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-vault-950 via-vault-900 to-vault-850 p-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-vault-800/80 border border-vault-700/80 flex items-center justify-center text-vault-accent shadow-inner group-hover:scale-110 transition-transform">
            <Film className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-mono text-slate-500 mt-2 line-clamp-1 max-w-[80%]">
            {alt}
          </span>
        </div>
      )}

      {/* Hover Overlay with Play Button */}
      {showPlayIcon && (
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
          <div className="w-11 h-11 rounded-full bg-vault-accent text-white flex items-center justify-center shadow-lg shadow-vault-accent/40 transform scale-75 group-hover:scale-100 transition-transform">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
}
