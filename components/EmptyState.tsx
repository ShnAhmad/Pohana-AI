"use client";

import { Sparkles } from "lucide-react";

const SUGGESTIONS = [
  "Explain quantum computing simply",
  "Write a Python function to reverse a linked list",
  "Give me 3 startup ideas for climate tech",
  "Draft a friendly follow-up email",
];

export default function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 animate-rise">
      <div className="w-12 h-12 rounded-2xl bg-glow/10 border border-glow/30 flex items-center justify-center mb-5">
        <Sparkles size={22} className="text-glow animate-glowPulse" />
      </div>
      <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight mb-2">
        What can I shine a light on?
      </h1>
      <p className="text-text-muted text-sm mb-8 max-w-md">
        Pohana AI is a free, open-source assistant running on Groq&apos;s LPU inference engine — built with Next.js.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-left text-sm px-4 py-3 rounded-xl border border-border bg-panel hover:border-glow/40 hover:bg-panel2 transition-colors text-text-muted hover:text-text"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
