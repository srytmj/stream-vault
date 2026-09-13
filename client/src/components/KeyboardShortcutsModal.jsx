import React from 'react';
import { Keyboard, X } from 'lucide-react';

export default function KeyboardShortcutsModal({ onClose }) {
  const shortcuts = [
    { key: 'Space', action: 'Play / Pause video' },
    { key: 'J', action: 'Rewind 10 seconds' },
    { key: 'L', action: 'Fast forward 10 seconds' },
    { key: '← / →', action: 'Seek backward / forward 5 seconds' },
    { key: '↑ / ↓', action: 'Increase / decrease volume 10%' },
    { key: 'M', action: 'Mute / unmute audio' },
    { key: 'F', action: 'Toggle Fullscreen' },
    { key: 'C', action: 'Open Subtitle selector / toggle' },
    { key: 'N', action: 'Jump to Next Episode (in series)' },
    { key: 'P', action: 'Jump to Previous Episode (in series)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative bg-vault-900 border border-vault-700/80 rounded-2xl max-w-md w-full shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-vault-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-vault-accent" />
            <h3 className="font-bold text-base text-white">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-2.5">
          {shortcuts.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-vault-850 border border-vault-800/80 text-xs"
            >
              <span className="text-slate-300 font-medium">{sc.action}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-vault-950 border border-vault-700 font-mono text-vault-accent font-bold shadow-inner">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-vault-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-vault-accent hover:bg-vault-accentHover text-xs font-bold text-white transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
