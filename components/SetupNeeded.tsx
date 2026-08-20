import { AlertTriangle } from "lucide-react";

export default function SetupNeeded() {
  return (
    <div className="flex flex-col items-center justify-center h-screen px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-glow/10 border border-glow/30 flex items-center justify-center mb-5">
        <AlertTriangle size={22} className="text-glow" />
      </div>
      <h1 className="font-display text-2xl font-semibold tracking-tight mb-2">
        Almost there — Supabase isn&apos;t configured yet
      </h1>
      <p className="text-text-muted text-sm max-w-md mb-6">
        Pohana AI needs a Supabase project to store conversations and handle
        sign-in. Add these two variables to your{" "}
        <code className="bg-panel border border-border rounded px-1.5 py-0.5">
          .env.local
        </code>{" "}
        file, then restart <code className="bg-panel border border-border rounded px-1.5 py-0.5">npm run dev</code>.
      </p>
      <pre className="text-left text-xs bg-panel border border-border rounded-xl px-4 py-3 max-w-md w-full overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here`}
      </pre>
      <p className="text-text-muted text-xs mt-6 max-w-md">
        See README section 3 for the full walkthrough — creating a project,
        the database schema to run, and where to find these values.
      </p>
    </div>
  );
}
