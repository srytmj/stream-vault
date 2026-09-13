import React, { useState } from 'react';
import { FolderPlus, X, AlertCircle, Check } from 'lucide-react';
import { createLibrary } from '../utils/api';

export default function AddLibraryModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [type, setType] = useState('anime');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !path.trim()) {
      setError('Nama library dan folder path wajib diisi.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const created = await createLibrary({
        name: name.trim(),
        path: path.trim(),
        type,
      });
      onCreated(created);
      setName('');
      setPath('');
      onClose();
    } catch (err) {
      setError(err.message || 'Gagal menambahkan library.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-vault-900 border border-vault-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-vault-800 bg-vault-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-vault-accent/15 border border-vault-accent/30 flex items-center justify-center text-vault-accent">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Tambah Library Baru</h2>
              <p className="text-xs text-slate-400">Hubungkan direktori harddisk homelab Anda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-vault-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nama Library
            </label>
            <input
              type="text"
              placeholder="Contoh: Anime Koleksi 1080p, Movie 4K, Drakor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-vault-950 border border-vault-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-vault-accent"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Folder Path di Server
            </label>
            <input
              type="text"
              placeholder="/media/anime atau /mnt/storage/movies"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-vault-950 border border-vault-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-vault-accent font-mono text-xs"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Path absolut di server/container (misal: <code className="text-slate-400">/media/anime</code> atau <code className="text-slate-400">/mnt/hdd/anime</code>)
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Tipe Konten
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'anime', label: 'Anime Series' },
                { id: 'movies', label: 'Movies / Film' },
                { id: 'tv', label: 'TV Shows / Series' },
                { id: 'mixed', label: 'Campuran / General' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setType(opt.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border text-left flex items-center justify-between transition ${
                    type === opt.id
                      ? 'bg-vault-accent/15 border-vault-accent text-vault-accent'
                      : 'bg-vault-950 border-vault-800 text-slate-400 hover:border-vault-700'
                  }`}
                >
                  <span>{opt.label}</span>
                  {type === opt.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-vault-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-vault-800 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-vault-accent hover:bg-vault-accent-hover rounded-xl shadow-lg shadow-vault-accent/20 transition disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : 'Simpan Library'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
