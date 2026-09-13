import React from 'react';
import { Cpu, HardDrive, ShieldCheck, Zap, X, Server, Layers } from 'lucide-react';

export default function StatsModal({ isOpen, serverHealth, mediaStats, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-vault-900 border border-vault-800 rounded-2xl max-w-lg w-full shadow-2xl p-6"
      >
        <div className="flex items-center justify-between pb-4 border-b border-vault-800">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-vault-accent" />
            <h3 className="font-bold text-base text-white">StreamVault Architecture & Status</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-vault-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          {/* Key Stat Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-vault-850 border border-vault-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>Server Transcode CPU</span>
              </div>
              <span className="text-xl font-extrabold text-emerald-400 font-mono">0.0%</span>
              <p className="text-[10px] text-slate-500 mt-1">Zero CPU spikes on seeking</p>
            </div>

            <div className="p-3.5 rounded-xl bg-vault-850 border border-vault-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Server className="w-3.5 h-3.5 text-cyan-400" />
                <span>Memory Footprint</span>
              </div>
              <span className="text-xl font-extrabold text-cyan-400 font-mono">
                {serverHealth?.memory?.rssMb || 22} MB
              </span>
              <p className="text-[10px] text-slate-500 mt-1">Ultra-lean Node runtime</p>
            </div>
          </div>

          {/* Architecture Details */}
          <div className="p-4 rounded-xl bg-vault-950 border border-vault-800/80 space-y-2.5 text-xs">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-vault-accent shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-200 block">HTTP 206 Partial Content Origin</span>
                <span className="text-slate-400 text-[11px]">
                  Delivers byte-range slices directly from your storage. Seeking is instantaneous without waiting for transcoding queues.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-vault-accent shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-200 block">100% Client-Side Hardware Acceleration</span>
                <span className="text-slate-400 text-[11px]">
                  Decodes H.264, HEVC, and AV1 video using your device's GPU (NVDEC, Intel QuickSync, Apple Silicon, VideoToolbox).
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Layers className="w-4 h-4 text-vault-accent shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-200 block">JASSUB WebAssembly Subtitle Engine</span>
                <span className="text-slate-400 text-[11px]">
                  Client browser renders stylized ASS/SSA anime subtitles on HTML5 canvas using compiled libass WASM.
                </span>
              </div>
            </div>
          </div>

          {/* Library Info */}
          <div className="p-3 rounded-xl bg-vault-850 border border-vault-800 text-xs flex items-center justify-between text-slate-400">
            <div>
              <span className="text-slate-200 font-semibold">Media Root: </span>
              <span className="font-mono text-[11px] text-slate-300">{serverHealth?.mediaRoot || '/media'}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-200 font-semibold">{mediaStats?.totalFiles || 0}</span> files scanned
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-vault-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-vault-800 hover:bg-vault-700 text-xs font-semibold text-white transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
