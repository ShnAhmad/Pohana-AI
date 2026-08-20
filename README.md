# Pohana AI

A fast, free, Claude‑style AI chat agent built with **Next.js 14** and **Groq** (free inference API), deployable on **Vercel** at $0 cost.

- 🧠 Streaming responses via the Vercel **AI SDK**
- ⚡ Powered by **Groq** — `llama-3.3-70b-versatile`, free tier, extremely fast
- 🎨 Custom dark UI ("glow" theme) — markdown + code block rendering
- 💸 Zero cost: Groq free tier + Vercel Hobby plan
- 🚀 One env variable to configure

---

## 1. How it works (architecture)

```
Browser (React/Next.js)
   │  types a message
   ▼
app/page.tsx  ──useChat()──▶  POST /api/chat
   │                                │
   │                                ▼
   │                      app/api/chat/route.ts (Edge/Node function)
   │                                │  streamText({ model: groq(...) })
   │                                ▼
   │                         Groq Cloud API (free)
   │                                │  token stream
   ◀────────── streamed tokens ─────┘
   renders live in the chat bubble
```

You do **not** need a separate backend server, database, or paid hosting.
Next.js API routes (`app/api/chat/route.ts`) *are* your backend — they run
as serverless functions on Vercel automatically.

---

## 2. Get a free Groq API key

1. Go to **https://console.groq.com**
2. Sign up (free, no credit card required)
3. Go to **API Keys** → **Create API Key**
4. Copy the key (starts with `gsk_...`)

Groq's free tier gives you generous daily/per-minute rate limits on models
like `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, and `gemma2-9b-it` —
plenty for a portfolio demo.

> Want a different free model later? Swap the model string in
> `app/api/chat/route.ts` — no other code changes needed.

---

## 3. Set up the database (Supabase, free)

Pohana AI stores conversations and messages in **Supabase** (a free hosted
Postgres database) and uses **Supabase Auth** (free, passwordless magic-link
email sign-in) so the right chats follow the right visitor across every
device they log into. There are no passwords to manage and no card required.

### 3.1 Create a project

1. Go to **https://supabase.com/dashboard** and sign up / log in.
2. Click **New Project**, pick an organization, name it `pohana-ai`, set a
   database password (save it somewhere — you likely won't need it again),
   and pick a region close to you.
3. Wait ~2 minutes for the project to finish provisioning.

### 3.2 Create the tables

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

-- Messages belong to a conversation
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade not null,
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
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );
```

This gives you two tables (`conversations`, `messages`) plus **Row Level
Security** policies that make Postgres itself enforce "you can only read or
write your own chats" — even if someone tampered with API requests, the
database would reject cross-user access.

### 3.3 Get your API keys

1. Go to **Project Settings** (gear icon) → **API**.
2. Copy the **Project URL** and the **anon / public** key.

### 3.4 Paste them into your app

Locally, in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

On Vercel: **Settings → Environment Variables**, same two names/values as
you did for `GROQ_API_KEY`, then redeploy.

### 3.5 Configure the magic-link redirect (important)

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

1. **`.env.local` is missing values.** The app now shows a clear "Almost
   there" setup screen instead of hanging if `NEXT_PUBLIC_SUPABASE_URL` /
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` aren't set — if you're not seeing that
   screen and the page just hangs instead, you're likely on an older copy of
   the code; re-download the project.
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

## 4. Staging vs. production (optional)

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

## 5. Run it locally

**Requirements:** Node.js 18.18+ and npm.

```bash
# 1. Install dependencies
npm install

# 2. Add your Groq key
cp .env.example .env.local
# then edit .env.local:
# GROQ_API_KEY=gsk_your_real_key_here

# 3. Run the dev server
npm run dev
```

Open **http://localhost:3000** — you should see Pohana AI's chat screen.

---

## 6. Project structure

```
pohana-ai/
├── app/
│   ├── api/
│   │   ├── chat/route.ts                     # streams from Groq, saves messages to Supabase
│   │   └── conversations/
│   │       ├── route.ts                      # list / create conversations
│   │       └── [id]/messages/route.ts        # fetch messages for a conversation
│   ├── auth/callback/route.ts                # exchanges magic-link code for a session
│   ├── login/page.tsx                        # passwordless email sign-in
│   ├── layout.tsx                            # fonts + global metadata
│   ├── page.tsx                              # server component: auth check + loads conversations
│   └── globals.css                           # theme, markdown/code styling
├── components/
│   ├── ChatApp.tsx          # client component: sidebar + streaming chat, wires it all together
│   ├── Sidebar.tsx          # conversation list, new chat, sign out
│   ├── Header.tsx           # logo + mobile sidebar toggle
│   ├── EmptyState.tsx       # greeting + suggestion chips
│   ├── SetupNeeded.tsx      # friendly screen shown if Supabase env vars are missing
│   ├── ChatMessage.tsx      # message bubble + markdown renderer
│   └── ChatInput.tsx        # auto-resizing input + send/stop button
├── lib/supabase/
│   ├── client.ts             # browser Supabase client
│   └── server.ts              # server Supabase client (Server Components, API routes)
├── middleware.ts             # keeps the auth session fresh on every request
├── .env.example
└── package.json
```

### The backend, explained (`app/api/chat/route.ts`)

```ts
import { groq } from "@ai-sdk/groq";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: "You are Pohana AI...",
    messages,
  });

  return result.toDataStreamResponse(); // streams tokens back to the browser
}
```

`streamText` calls Groq's OpenAI-compatible chat completions endpoint and
streams the response back as it's generated — that's what gives you the
"typing" effect in the UI, same as Claude/ChatGPT.

### The frontend, explained (`app/page.tsx`)

Uses the AI SDK's `useChat()` hook, which manages message state, calls
`/api/chat`, and updates the UI token-by-token as the stream arrives — no
manual `fetch`/`EventSource` handling needed.

---

## 7. Deploy to Vercel (free)

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
4. Under **Environment Variables**, add all three:
   - `GROQ_API_KEY` = your Groq key
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click **Deploy**.
6. Once deployed, go back to Supabase → **Authentication → URL
   Configuration** and add your new `https://<your-app>.vercel.app/auth/callback`
   URL to **Redirect URLs** (see step 3.5) — magic links won't work until you do.

**Option B — via Vercel CLI**

```bash
npm i -g vercel
vercel login
vercel            # deploy preview
vercel env add GROQ_API_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY   # paste each value when prompted
vercel --prod     # deploy to production
```

Your app will be live at `https://pohana-ai-<hash>.vercel.app` (or a custom
domain you attach in the Vercel dashboard) — all on Vercel's free Hobby plan.

---

## 8. Customizing

- **Change the model:** edit the string inside `groq("...")` in
  `app/api/chat/route.ts`. Other free Groq models: `llama-3.1-8b-instant`
  (fastest), `gemma2-9b-it`, `mixtral-8x7b-32768` (check
  console.groq.com/docs/models for the current list).
- **Change the personality:** edit `SYSTEM_PROMPT` in the same file.
- **Change the look:** colors/fonts are defined as design tokens in
  `tailwind.config.ts` (`glow`, `ink`, `panel`, etc.) and `app/layout.tsx`
  (Space Grotesk / Inter / JetBrains Mono).
- **Rename a conversation, delete a chat:** add `PATCH`/`DELETE` handlers to
  `app/api/conversations/[id]/route.ts` (not included by default, but the
  RLS policies already support it — just call `.update()` / `.delete()`
  scoped to `id`).

---

## 9. Cost summary

| Piece | Cost |
|---|---|
| Groq API (llama-3.3-70b) | Free tier |
| Supabase (Postgres + Auth) | Free tier (500MB DB, 50k monthly active users) |
| Vercel hosting (Hobby plan) | Free |
| Next.js, AI SDK, all npm packages | Free/open-source |

**Total: $0/month** for a portfolio-scale project.
