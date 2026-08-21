"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setStatus("error");
      setErrorMessage("Supabase environment variables are not set.");
      return;
    }
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      console.error("signInWithOtp error:", error);
      setErrorMessage(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-glow/10 border border-glow/30 flex items-center justify-center mb-5">
        <Sparkles size={22} className="text-glow animate-glowPulse" />
      </div>
      <h1 className="font-display text-2xl font-semibold tracking-tight mb-2">
        Sign in to Pohana AI
      </h1>
      <p className="text-text-muted text-sm mb-8 max-w-sm">
        We&apos;ll email you a magic link — no password needed. Your chats sync
        across every device you sign in on.
      </p>

      {status === "sent" ? (
        <p className="text-sm text-glow max-w-sm">
          Check <span className="font-medium">{email}</span> for the sign-in link.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-sm">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="bg-panel border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-glow/50 transition-colors"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="bg-glow text-ink font-medium rounded-xl px-4 py-2.5 text-sm disabled:opacity-60 transition-opacity"
          >
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
          {status === "error" && (
            <p className="text-xs text-red-400">Something went wrong. Please try again.</p>
          )}
        </form>
      )}
    </div>
  );
}
