import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Folder,
  Sparkles,
  Check,
  Loader2,
  Image as ImageIcon,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { fetchFolderConfig, updateFolderThumbnail, appendAuthToken } from '../utils/api';

export default function FolderThumbModal({ isOpen, onClose, folder, onUpdated }) {
  const [mode, setMode] = useState('auto'); // 'auto' | 'custom' | 'none'
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !folder) return;

    setLoadingConfig(true);
    setError(null);
    setSelectedFile(null);
    setPreviewUrl(null);

    fetchFolderConfig(folder.subpath)
      .then((cfg) => {
        setConfig(cfg);
        setMode(cfg.mode || 'auto');
        if (cfg.customThumbnailUrl) {
          setPreviewUrl(appendAuthToken(cfg.customThumbnailUrl));
        }
      })
      .catch((err) => {
        setError(err.message || 'Gagal memuat konfigurasi folder');
      })
      .finally(() => {
        setLoadingConfig(false);
      });
  }, [isOpen, folder?.subpath]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Harap pilih file gambar (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Ukuran file maksimal 10 MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setMode('custom');

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      if (mode === 'custom' && !selectedFile && !config?.customThumbnailUrl) {
        throw new Error('Silakan pilih file gambar untuk mode kustom');
      }

      await updateFolderThumbnail({
        subpath: folder.subpath,
        mode,
        file: selectedFile,
      });

      onUpdated?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan thumbnail folder');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-vault-900 border border-vault-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-vault-800 bg-vault-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Atur Thumbnail Folder
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-xs" title={folder?.name}>
                {folder?.name || folder?.subpath}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-vault-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {loadingConfig ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 text-vault-accent animate-spin mb-2" />
              <p className="text-xs text-slate-400">Memeriksa video dan thumbnail folder...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/25 rounded-2xl flex items-start gap-2.5 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{error}</div>
                </div>
              )}

              <p className="text-xs text-slate-400">
                Pilih salah satu dari 3 mode thumbnail untuk folder ini:
              </p>

              {/* 3 Modes Radio Grid */}
              <div className="space-y-3">
                {/* MODE 1: OTOMATIS */}
                <div
                  onClick={() => setMode('auto')}
                  className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
                    mode === 'auto'
                      ? 'bg-vault-850 border-vault-accent shadow-md shadow-vault-accent/10'
                      : 'bg-vault-950/60 border-vault-800 hover:border-vault-700'
                  }`}
                >
                  <div className="pt-0.5">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        mode === 'auto'
                          ? 'border-vault-accent bg-vault-accent'
                          : 'border-slate-600'
                      }`}
                    >
                      {mode === 'auto' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Mode 1: Otomatis (Ambil dari Video)</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-vault-800 rounded text-amber-400 font-semibold border border-vault-700">
                        Rekomendasi
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-3">
                      Sistem mengambil snapshot dari video yang ada di dalam folder ini secara otomatis.
                    </p>

                    {/* Preview Mode 1 */}
                    {config?.autoThumbnailUrl ? (
                      <div className="w-40 aspect-video rounded-xl overflow-hidden border border-vault-700/80 shadow">
                        <img
                          src={appendAuthToken(config.autoThumbnailUrl)}
                          alt="Auto Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="p-2.5 bg-vault-900 rounded-xl text-[11px] text-slate-500 font-mono">
                        Tidak ada video langsung ditemukan di folder ini
                      </div>
                    )}
                  </div>
                </div>

                {/* MODE 2: KUSTOM UPLOAD */}
                <div
                  onClick={() => setMode('custom')}
                  className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
                    mode === 'custom'
                      ? 'bg-vault-850 border-vault-accent shadow-md shadow-vault-accent/10'
                      : 'bg-vault-950/60 border-vault-800 hover:border-vault-700'
                  }`}
                >
                  <div className="pt-0.5">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        mode === 'custom'
                          ? 'border-vault-accent bg-vault-accent'
                          : 'border-slate-600'
                      }`}
                    >
                      {mode === 'custom' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-vault-accent" />
                        <span>Mode 2: Kustom (Upload Gambar)</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-3">
                      Upload gambar sampul sendiri (format JPG, PNG, atau WebP, maks 10MB).
                    </p>

                    {/* File Upload Zone */}
                    <div className="space-y-3">
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-vault-700 hover:border-vault-accent/80 rounded-xl p-4 bg-vault-950 cursor-pointer transition group">
                        <Upload className="w-5 h-5 text-slate-400 group-hover:text-vault-accent mb-1 transition" />
                        <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
                          {selectedFile ? selectedFile.name : 'Pilih File Gambar'}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-0.5">
                          Klik untuk upload dari perangkat Anda
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>

                      {/* Preview for Custom Mode */}
                      {previewUrl && mode === 'custom' && (
                        <div className="flex items-center gap-3 p-2 bg-vault-950 rounded-xl border border-vault-800">
                          <div className="w-24 aspect-video rounded-lg overflow-hidden border border-vault-700 flex-shrink-0">
                            <img
                              src={previewUrl}
                              alt="Custom Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            <span className="font-semibold text-white block">Preview Kustom</span>
                            <span className="text-slate-500">
                              {selectedFile ? `${Math.round(selectedFile.size / 1024)} KB` : 'Tersimpan'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* MODE 3: BIARIN KOSONG */}
                <div
                  onClick={() => setMode('none')}
                  className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
                    mode === 'none'
                      ? 'bg-vault-850 border-vault-accent shadow-md shadow-vault-accent/10'
                      : 'bg-vault-950/60 border-vault-800 hover:border-vault-700'
                  }`}
                >
                  <div className="pt-0.5">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        mode === 'none'
                          ? 'border-vault-accent bg-vault-accent'
                          : 'border-slate-600'
                      }`}
                    >
                      {mode === 'none' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5 text-slate-400" />
                        <span>Mode 3: Biarin Kosong (Ikon Folder Bawaan)</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-3">
                      Folder tidak memakai gambar thumbnail dan akan tampil dengan ikon folder bawaan.
                    </p>

                    <div className="w-40 aspect-video rounded-xl bg-vault-950 border border-vault-800 flex flex-col items-center justify-center text-slate-600">
                      <Folder className="w-8 h-8 text-amber-400/40" />
                      <span className="text-[10px] text-slate-500 mt-1">Ikon Standar</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 border-t border-vault-800 bg-vault-950/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 bg-vault-800 hover:bg-vault-700 text-slate-300 text-xs font-semibold rounded-xl transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || loadingConfig}
            className="px-5 py-2 bg-vault-accent hover:bg-vault-accent-hover text-white text-xs font-bold rounded-xl shadow-lg shadow-vault-accent/25 flex items-center gap-2 transition disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Pengaturan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
