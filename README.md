# Pohana AI

A fast, free, Claude‑style AI chat agent built with **Next.js 14**, **Groq**
+ **Cerebras** (free inference, with automatic fallback), and **Supabase**
(free Postgres + Auth), deployable on **Vercel** at $0 cost.

- 🧠 Streaming responses via the Vercel **AI SDK**
- ⚡ Powered by **Groq** (`openai/gpt-oss-120b`) — free tier, extremely fast
- 🔁 Automatically falls back to **Cerebras** (same model) if Groq is
  rate-limited or down — no user-visible failure
- 💾 Conversations saved per-user in **Supabase**, with rename/delete
- 🔐 Passwordless email sign-in (Supabase Auth magic links)
- 🎨 Custom dark UI ("glow" theme) — markdown + code block rendering
- 💸 Zero cost: Groq + Cerebras + Supabase free tiers + Vercel Hobby plan

---

## 1. How it works (architecture)

```
Browser (React/Next.js)
   │  types a message
   ▼
components/ChatApp.tsx ──useChat()──▶  POST /api/chat
   │                                          │
   │                                          ▼
   │                          app/api/chat/route.ts (Vercel serverless function)
   │                                          │  pickModel() health-checks Groq,
   │                                          │  falls back to Cerebras if needed
   │                                          ▼
   │                            Groq Cloud API  — or —  Cerebras Cloud API
   │                                          │  token stream
   ◀──────────────── streamed tokens ─────────┘
   renders live in the chat bubble
```

You do **not** need a separate backend server or paid hosting. Next.js API
routes (`app/api/`) *are* your backend — they run as serverless functions on
Vercel automatically. Conversations and messages persist in Supabase, so
chats survive refreshes and follow a signed-in user across devices.

---

## 2. Get a free Groq API key (primary model)

1. Go to **https://console.groq.com**
2. Sign up (free, no credit card required)
3. Go to **API Keys** → **Create API Key**
4. Copy the key (starts with `gsk_...`)

This project uses `openai/gpt-oss-120b` on Groq by default. Groq retires
models periodically (this project originally used `llama-3.3-70b-versatile`,
which Groq shut down in August 2026) — if you ever see a `model_not_found`
error, check **console.groq.com/docs/models** for the current list and
update `GROQ_MODEL_NAME` in `app/api/chat/route.ts`.

---

## 3. Get a free Cerebras API key (automatic fallback)

Cerebras hosts the *same* `gpt-oss-120b` model on different hardware. If
Groq is ever slow, rate-limited, or down, the app automatically switches to
Cerebras for that request — the user never sees a failure.

1. Go to **https://cloud.cerebras.ai** and sign up (free, no credit card).
2. Go to **API Keys** → copy your **Default Key** (or generate a new one —
   either works, no need for more than one).

### How the fallback actually works

Before generating a reply, the backend runs a tiny 1-token test call against
Groq. If it succeeds, the real (streaming) reply comes from Groq as normal.
If it fails, the app switches to Cerebras for that reply — and remembers
that choice for 60 seconds, so it doesn't re-check on every single message.
This trades a small delay (a few hundred ms, only once every 60 seconds)
for guaranteeing the *whole* reply comes from a working provider, rather
than a stream failing partway through.

Every response includes an `X-Model-Provider` response header (`groq` or
`cerebras`) — check it in your browser's DevTools → Network tab if you ever
want to confirm which provider actually answered.

---

## 4. Set up the database (Supabase, free)

Pohana AI stores conversations and messages in **Supabase** (a free hosted
Postgres database) and uses **Supabase Auth** (free, passwordless magic-link
email sign-in) so the right chats follow the right visitor across every
device they log into. There are no passwords to manage and no card required.

### 4.1 Create a project

1. Go to **https://supabase.com/dashboard** and sign up / log in.
2. Click **New Project**, pick an organization, name it `pohana-ai`, set a
   database password (save it somewhere — you likely won't need it again),
   and pick a region close to you.
3. Wait ~2 minutes for the project to finish provisioning.

### 4.2 Create the tables

1. In your project, open the **SQL Editor** (left sidebar) → **New query**.
2. Paste the schema below and click **Run**.

```sql
-- Conversations belong to a signed-in user
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text default 'New chat',
  created_at timestamptz default now()
);

-- Messages belong to a conversation AND carry their own user_id directly
-- (not just via a join to conversations) — this keeps the delete policy
-- below independent of whether the parent conversation still exists,
-- which matters for cascading deletes.
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- Row Level Security: users can only ever see their own data
alter table conversations enable row level security;
alter table messages enable row level security;

create policy "Users manage own conversations"
  on conversations for all
  using (auth.uid() = user_id);

create policy "Users manage own messages"
  on messages for all
  using (auth.uid() = user_id);
```

This gives you two tables (`conversations`, `messages`) plus **Row Level
Security** policies that make Postgres itself enforce "you can only read or
write your own chats" — even if someone tampered with API requests, the
database would reject cross-user access. Giving `messages` its own
`user_id` (rather than checking ownership only via a join to
`conversations`) avoids a common RLS pitfall where cascading deletes fail
because the parent row is already gone by the time the policy is checked.

### 4.3 Get your API keys

1. Go to **Project Settings** (gear icon) → **API**.
2. Copy the **Project URL** and the **anon / public** key. (Make sure it's
   the bare project URL — `https://xxxx.supabase.co` — not the `/rest/v1`
   REST endpoint shown elsewhere on that page; they're easy to mix up.)

### 4.4 Paste them into your app

Locally, in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

On Vercel: **Settings → Environment Variables**, same names/values, then
redeploy.

### 4.5 Configure the magic-link redirect (important)

Supabase needs to know it's allowed to redirect back to your app after
someone clicks the email link.

1. In Supabase: **Authentication → URL Configuration**.
2. Set **Site URL** to your deployed URL, e.g. `https://pohana-ai.vercel.app`.
3. Under **Redirect URLs**, add:
   - `http://localhost:3000/auth/callback` (for local dev)
   - `https://pohana-ai.vercel.app/auth/callback` (your production domain)

Without this step, clicking the magic link will fail or redirect to the
wrong place.

---

### Troubleshooting: localhost not responding

If `npm run dev` starts but the page hangs, errors, or never loads, it's
almost always one of these — check in order:

1. **`.env.local` is missing values.** The app shows a clear "Almost
   there" setup screen instead of hanging if `NEXT_PUBLIC_SUPABASE_URL` /
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` aren't set.
2. **You edited `.env.local` but didn't restart the server.** Next.js only
   reads env files on startup — stop (`Ctrl+C`) and run `npm run dev` again
   after any `.env.local` change.
3. **Extra spaces or quotes in `.env.local`.** It should look exactly like
   `NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co` — no quotes, no
   trailing slash on the URL.
4. **Port 3000 already in use.** If another process is on that port, Next
   will either fail to start or silently pick a different port (check the
   terminal output for the actual URL, e.g. `http://localhost:3001`).
5. **Node version.** Run `node -v` — you need 18.18 or newer. If it's older,
   update Node (e.g. via `nvm install --lts`).
6. **Check the terminal, not just the browser.** Next.js prints the real
   error (missing env var, Supabase auth error, etc.) in the terminal
   running `npm run dev` — that message tells you exactly what's wrong.

---

## 5. Staging vs. production (optional)

Supabase's built-in **Branching** feature (a live database per Git branch)
requires the **Pro plan** ($25/month base) — it isn't part of the free tier.
For a $0 setup, do this instead:

1. Create a **second, separate Supabase project** the same way as above
   (e.g. `pohana-ai-staging`), and run the same SQL schema in it.
2. In Vercel, go to **Settings → Environment Variables**. Add each Supabase
   variable **twice** — once scoped to the **Production** environment
   (pointing at your real project) and once scoped to **Preview** (pointing
   at the staging project). Vercel already deploys every non-`main` branch
   as a free Preview deployment automatically.
3. Now: pushing to `main` deploys against production data, and pushing any
   other branch (or opening a PR) deploys a Preview build against your
   staging database — fully separated, fully free.

For local development, just keep your local `.env.local` pointed at the
staging project so you're never testing against real production data.

---

## 6. Run it locally

**Requirements:** Node.js 18.18+ and npm.

```bash
# 1. Install dependencies
npm install

# 2. Add your keys
cp .env.example .env.local
# then edit .env.local with your real values (see sections 2–4 above)

# 3. Run the dev server
npm run dev
```

Open **http://localhost:3000** — you should see Pohana AI's chat screen.

### Environment variables

| Variable | Required | Where it comes from |
|---|---|---|
| `GROQ_API_KEY` | Yes | console.groq.com → API Keys |
| `CEREBRAS_API_KEY` | Yes | cloud.cerebras.ai → API Keys |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase → Project Settings → API |

---

## 7. Project structure

```
pohana-ai/
├── app/
│   ├── api/
│   │   ├── chat/route.ts                     # streams from Groq/Cerebras, saves messages to Supabase
│   │   └── conversations/
│   │       ├── route.ts                      # list / create conversations
│   │       └── [id]/
│   │           ├── route.ts                  # PATCH (rename) / DELETE a conversation
│   │           └── messages/route.ts         # fetch messages for a conversation
│   ├── auth/callback/route.ts                # exchanges magic-link code for a session
│   ├── login/
│   │   ├── layout.tsx                        # page-specific SEO title ("Sign in | Pohana AI")
│   │   └── page.tsx                          # passwordless email sign-in
│   ├── layout.tsx                            # fonts + full SEO metadata (OG/Twitter/JSON-LD) + global styles
│   ├── page.tsx                               # server component: auth check + loads conversations
│   ├── globals.css                           # theme, markdown/code styling
│   ├── manifest.ts                           # PWA web app manifest (/manifest.webmanifest)
│   ├── robots.ts                             # robots.txt — allows crawling, points to the sitemap
│   ├── sitemap.ts                            # sitemap.xml
│   ├── favicon.ico                           # auto-detected by Next.js (app/ special-file convention)
│   ├── icon.png                              # 192×192 app icon (same convention)
│   ├── apple-icon.png                        # iOS home-screen icon
│   ├── opengraph-image.png                   # 1200×630 social share card (og:image)
│   └── twitter-image.png                     # Twitter/X card image
├── components/
│   ├── ChatApp.tsx          # client component: sidebar + streaming chat, wires it all together
│   ├── Sidebar.tsx          # conversation list, new chat, rename, delete, sign out
│   ├── ConfirmModal.tsx     # themed confirmation dialog (delete / sign out)
│   ├── Header.tsx           # logo + sticky mobile sidebar toggle
│   ├── EmptyState.tsx       # greeting + suggestion chips
│   ├── SetupNeeded.tsx      # friendly screen shown if Supabase env vars are missing
│   ├── ChatMessage.tsx      # message bubble + markdown renderer
│   └── ChatInput.tsx        # auto-resizing input + send/stop button
├── lib/
│   ├── site.ts                # SITE_URL / title / description / keywords — single source of
│   │                           # truth for all SEO metadata, the sitemap, robots.txt & JSON-LD
│   └── supabase/
│       ├── client.ts          # browser Supabase client
│       └── server.ts          # server Supabase client (Server Components, API routes)
├── public/
│   ├── icon-192.png          # PWA icon (referenced by manifest.ts)
│   ├── icon-512.png          # PWA icon (referenced by manifest.ts)
│   ├── icon-512-maskable.png # PWA maskable icon (safe-zone padded)
│   └── og-image.png          # source copy of the share image
├── middleware.ts             # keeps the auth session fresh on every request
├── .env.example
└── package.json
```

### SEO & social sharing assets

`favicon.ico`, `icon.png`, `apple-icon.png`, `opengraph-image.png`, and
`twitter-image.png` sit directly in `app/` on purpose — that's Next.js's
special-file convention, and it auto-generates the right `<link>`/`<meta>`
tags with zero config. The remaining PWA icon sizes live in `public/` and
are wired up in `app/manifest.ts`. All copy (title, description, keywords)
is centralized in `lib/site.ts`.

If you ever redesign the logo, just replace these files (same names/sizes)
and everything — favicon, PWA icons, and the share image — updates
automatically; no other file needs to change.

### The backend, explained (`app/api/chat/route.ts`)

```ts
import { groq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText } from "ai";

// Cerebras speaks the OpenAI-compatible API format, so it's used through
// the official OpenAI provider, just pointed at a different baseURL.
const cerebras = createOpenAI({
  apiKey: process.env.CEREBRAS_API_KEY,
  baseURL: "https://api.cerebras.ai/v1",
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const { model } = await pickModel(); // health-checks Groq, falls back to Cerebras

  const result = streamText({
    model,
    system: "You are Pohana AI...",
    messages,
  });

  return result.toDataStreamResponse(); // streams tokens back to the browser
}
```

`streamText` calls the chosen provider's OpenAI-compatible chat completions
endpoint and streams the response back as it's generated — that's what
gives you the "typing" effect in the UI, same as Claude/ChatGPT.

### The frontend, explained (`components/ChatApp.tsx`)

Uses the AI SDK's `useChat()` hook, which manages message state, calls
`/api/chat`, and updates the UI token-by-token as the stream arrives — no
manual `fetch`/`EventSource` handling needed.

---

## 8. Deploy to Vercel (free)

**Option A — via GitHub (recommended)**

1. Push this project to a new GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Pohana AI"
   git branch -M main
   git remote add origin https://github.com/<you>/pohana-ai.git
   git push -u origin main
   ```
2. Go to **https://vercel.com/new** and import that repo.
3. Vercel auto-detects Next.js — leave build settings as default.
4. Under **Environment Variables**, add all four:
   - `GROQ_API_KEY`
   - `CEREBRAS_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**.
6. Once deployed, go back to Supabase → **Authentication → URL
   Configuration** and add your new `https://<your-app>.vercel.app/auth/callback`
   URL to **Redirect URLs** (see step 4.5) — magic links won't work until you do.

**Option B — via Vercel CLI**

```bash
npm i -g vercel
vercel login
vercel            # deploy preview
vercel env add GROQ_API_KEY
vercel env add CEREBRAS_API_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY   # paste each value when prompted
vercel --prod     # deploy to production
```

Your app will be live at `https://pohana-ai-<hash>.vercel.app` (or a custom
domain you attach in the Vercel dashboard) — all on free tiers.

---

## 9. Customizing

- **Change the model:** edit `GROQ_MODEL_NAME` / `CEREBRAS_MODEL_NAME` in
  `app/api/chat/route.ts`. Both Groq and Cerebras retire models over time —
  if you see a `model_not_found` error, check **console.groq.com/docs/models**
  and **inference-docs.cerebras.ai/models** for current options. Note each
  provider names the same model slightly differently (e.g. Groq needs an
  `openai/` prefix, Cerebras doesn't) — update both constants to match.
- **Change the personality:** edit `SYSTEM_PROMPT` in the same file.
- **Change the look:** colors/fonts are defined as design tokens in
  `tailwind.config.ts` (`glow`, `ink`, `panel`, etc.) and `app/layout.tsx`
  (Space Grotesk / Inter / JetBrains Mono).
- **Rename or delete a conversation:** already built in — use the ⋯ menu
  next to any chat in the sidebar (`app/api/conversations/[id]/route.ts`
  handles both via `PATCH` and `DELETE`).

---

## 10. Cost summary

| Piece | Cost |
|---|---|
| Groq API (`gpt-oss-120b`) | Free tier |
| Cerebras API (fallback, same model) | Free tier |
| Supabase (Postgres + Auth) | Free tier (500MB DB, 50k monthly active users) |
| Vercel hosting (Hobby plan) | Free |
| Next.js, AI SDK, all npm packages | Free/open-source |

**Total: $0/month** for a portfolio-scale project.