import React, { useState } from 'react';
import {
  Play,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  Globe,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, providers } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Harap masukkan username dan password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || 'Login gagal. Periksa kembali username dan password.');
    } finally {
      setLoading(false);
    }
  };

  const handleOidcLogin = () => {
    window.location.href = providers.oidc?.loginUrl || '/api/auth/oidc/login';
  };

  return (
    <div className="min-h-screen bg-vault-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden selection:bg-vault-accent selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-vault-accent/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-vault-900/90 border border-vault-800/80 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-vault-accent to-amber-500 flex items-center justify-center shadow-xl shadow-vault-accent/25 mb-4 group hover:scale-105 transition-transform">
            <Play className="w-7 h-7 text-white fill-white ml-0.5" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
            <span>Stream</span>
            <span className="text-vault-accent">Vault</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Zero-Transcode Homelab Media Platform</span>
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/25 rounded-2xl flex items-start gap-2.5 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                autoFocus
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-vault-950 border border-vault-800 focus:border-vault-accent rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-vault-accent/20 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-vault-950 border border-vault-800 focus:border-vault-accent rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-vault-accent/20 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-vault-accent to-amber-500 hover:from-vault-accent-hover hover:to-amber-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-vault-accent/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <>
                <span>Masuk ke StreamVault</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* SSO / OIDC Infrastructure Section */}
        <div className="mt-6 pt-6 border-t border-vault-800/80">
          {providers.oidc?.enabled ? (
            <button
              type="button"
              onClick={handleOidcLogin}
              className="w-full py-2.5 bg-vault-800 hover:bg-vault-700 border border-vault-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition"
            >
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Masuk dengan {providers.oidc.name || 'Single Sign-On (OIDC)'}</span>
            </button>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-slate-500 bg-vault-950 p-2.5 rounded-xl border border-vault-800">
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>SSO / OIDC Ready</span>
              </div>
              <span className="font-mono text-[10px] text-slate-600">OIDC Provider Config</span>
            </div>
          )}
        </div>

        {/* Default Account Hint Box ala Komga/Jellyfin First Run */}
        <div className="mt-6 p-3 bg-vault-950/80 rounded-2xl border border-vault-800 text-[11px] text-slate-400 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-300">Akun Awal Homelab:</span>
            <div className="font-mono text-slate-400 mt-0.5">
              Username: <span className="text-vault-accent">admin</span> | Password:{' '}
              <span className="text-vault-accent">admin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="mt-8 text-center text-xs text-slate-500">
        StreamVault &bull; 100% Client-Side Hardware Decoding
      </footer>
    </div>
  );
}
