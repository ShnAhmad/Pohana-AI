"use client";

import { ArrowUp, Square } from "lucide-react";
import { useRef, useEffect } from "react";

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  onStop,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  onStop: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "0px";
    ref.current.style.height = Math.min(ref.current.scrollHeight, 200) + "px";
  }, [value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) onSubmit();
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-end gap-2 bg-panel border border-border rounded-2xl px-3 py-2 focus-within:border-glow/50 transition-colors">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Message Pohana AI…"
          className="flex-1 resize-none bg-transparent outline-none text-[15px] leading-6 placeholder:text-text-muted py-1.5 max-h-[200px]"
        />
        {isLoading ? (
          <button
            onClick={onStop}
            aria-label="Stop generating"
            className="flex-shrink-0 w-8 h-8 rounded-full bg-panel2 border border-border flex items-center justify-center text-text-muted hover:text-text transition-colors"
          >
            <Square size={13} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={onSubmit}
            disabled={!value.trim()}
            aria-label="Send message"
            className="flex-shrink-0 w-8 h-8 rounded-full bg-glow disabled:bg-panel2 disabled:text-text-muted text-ink flex items-center justify-center transition-colors"
          >
            <ArrowUp size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>
      <p className="text-center text-xs text-text-muted mt-2">
        Pohana AI can make mistakes. Verify important information.
      </p>
    </div>
  );
}
