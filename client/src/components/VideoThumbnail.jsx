import React, { useState, useEffect, useRef } from 'react';
import { Film, Play } from 'lucide-react';
import { appendAuthToken } from '../utils/api';

// In-memory cache for client-side generated video frame thumbnails & resolved images
const thumbnailCache = new Map();

export default function VideoThumbnail({
  streamUrl,
  posterUrl,
  thumbnailUrl,
  alt = 'Video thumbnail',
  className = '',
  aspectRatio = 'aspect-video',
  showPlayIcon = true,
}) {
  const effectiveServerThumb = posterUrl || thumbnailUrl;

  const [isVisible, setIsVisible] = useState(false);
  const [thumbSrc, setThumbSrc] = useState(() => {
    const key = effectiveServerThumb || streamUrl;
    if (key && thumbnailCache.has(key)) {
      return thumbnailCache.get(key);
    }
    return null;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasError, setHasError] = useState(false);

  const containerRef = useRef(null);
  const videoRef = useRef(null);

  // Intersection Observer for viewport lazy loading
  useEffect(() => {
    if (isVisible) return;

    const el = containerRef.current;
    if (!el) return;

    // If already cached, mark visible immediately
    const key = effectiveServerThumb || streamUrl;
    if (key && thumbnailCache.has(key)) {
      setIsVisible(true);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px' }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [isVisible, effectiveServerThumb, streamUrl]);

  // Load thumbnail when visible
  useEffect(() => {
    if (!isVisible) return;

    const key = effectiveServerThumb || streamUrl;
    if (key && thumbnailCache.has(key)) {
      setThumbSrc(thumbnailCache.get(key));
      setHasError(false);
      return;
    }

    if (effectiveServerThumb) {
      const fullUrl = appendAuthToken(effectiveServerThumb);
      setThumbSrc(fullUrl);
      thumbnailCache.set(key, fullUrl);
      setHasError(false);
      return;
    }

    if (!streamUrl) return;

    // Fast client-side snapshot from HTML5 video element (0% server CPU)
    let isCancelled = false;
    setIsGenerating(true);

    const video = document.createElement('video');
    videoRef.current = video;
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = appendAuthToken(streamUrl);

    const onLoadedMetadata = () => {
      const targetTime = Math.min(2, Math.max(0.5, (video.duration || 10) * 0.05));
      video.currentTime = targetTime;
    };

    const onSeeked = () => {
      if (isCancelled) return;
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 360;
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
      } catch {
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

    const timer = setTimeout(() => {
      if (isGenerating && !thumbSrc) {
        cleanup();
        if (!isCancelled) {
          setIsGenerating(false);
          setHasError(true);
        }
      }
    }, 4000);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      cleanup();
    };
  }, [isVisible, effectiveServerThumb, streamUrl]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-vault-900 flex items-center justify-center group ${aspectRatio} ${className}`}
    >
      {thumbSrc && !hasError ? (
        <img
          src={thumbSrc}
          alt={alt}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      ) : (
        /* Sleek Jellyfin-style minimal fallback */
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-[#0b0e14] via-[#141922] to-[#1c2330] p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-vault-accent group-hover:scale-110 transition-all">
            <Film className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium text-slate-400 mt-2 line-clamp-1 max-w-[85%]">
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
