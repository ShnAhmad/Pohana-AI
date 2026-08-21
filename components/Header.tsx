"use client";

import { Sparkles, RotateCcw, Menu, Plus } from "lucide-react";

export default function Header({
  onReset,
  hasMessages,
  onToggleSidebar,
}: {
  onReset: () => void;
  hasMessages: boolean;
  onToggleSidebar?: () => void;
}) {
  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
      <div className="flex items-center gap-2">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="sm:hidden text-text-muted hover:text-text mr-1"
            aria-label="Toggle sidebar"
          >
            <Menu size={18} />
          </button>
        )}
        <div className="w-7 h-7 rounded-lg bg-glow/10 border border-glow/30 flex items-center justify-center">
          <Sparkles size={14} className="text-glow animate-glowPulse" />
        </div>
        <span className="font-display font-semibold text-[15px] tracking-tight">Pohana AI</span>
      </div>

      {hasMessages && (
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text border border-border hover:border-glow/40 rounded-full px-3 py-1.5 transition-colors"
        >
          <Plus size={12} />
          New chat
        </button>
      )}
    </header>
  );
}
