// Central place for site-wide constants used in SEO metadata, the sitemap,
// robots.txt, and JSON-LD structured data.
//
// IMPORTANT: set NEXT_PUBLIC_SITE_URL in your environment (Vercel Project
// Settings → Environment Variables) to your real production domain, e.g.
// https://pohana-ai.vercel.app or https://pohana.ai — without a trailing
// slash. Falls back to the placeholder below for local development only.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://pohana-ai.vercel.app";

export const SITE_NAME = "Pohana AI";

export const SITE_TITLE = "Pohana AI — Free, Open-Source AI Chat Assistant";

export const SITE_DESCRIPTION =
  "Pohana AI is a fast, free, open-source AI chat assistant built with Next.js and Supabase, powered by Groq's LPU inference engine. Chat instantly — no cost, no lock-in.";

export const SITE_KEYWORDS = [
  "Pohana AI",
  "Pohana",
  "AI chat assistant",
  "free AI chatbot",
  "open source AI chat",
  "Groq AI chat",
  "Next.js AI assistant",
  "fast AI chatbot",
  "AI agent",
];
