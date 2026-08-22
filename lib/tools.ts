import { tool } from "ai";
import { z } from "zod";

// WMO weather codes → plain-English conditions (used by Open-Meteo).
const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

// Open-Meteo is completely free and requires no API key at all — good fit
// for a dedicated weather tool rather than routing it through general
// web search, since it returns clean structured data instead of prose.
export const getWeather = tool({
  description:
    "Get the current real-time weather for a city or location. Use this whenever the user asks about current weather, temperature, or conditions anywhere.",
  parameters: z.object({
    location: z
      .string()
      .describe("City name, optionally with country, e.g. 'Riyadh' or 'Paris, France'"),
  }),
  execute: async ({ location }) => {
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`,
        { signal: AbortSignal.timeout(8000) }
      );
      const geoJson = await geoRes.json();
      const place = geoJson?.results?.[0];
      if (!place) {
        return { error: `Could not find a location matching "${location}".` };
      }

      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`,
        { signal: AbortSignal.timeout(8000) }
      );
      const weatherJson = await weatherRes.json();
      const current = weatherJson?.current;
      if (!current) {
        return { error: "Weather service did not return data for this location." };
      }

      return {
        location: `${place.name}${place.admin1 ? ", " + place.admin1 : ""}, ${place.country}`,
        temperatureC: current.temperature_2m,
        feelsLikeC: current.apparent_temperature,
        humidityPercent: current.relative_humidity_2m,
        windSpeedKmh: current.wind_speed_10m,
        condition: WEATHER_CODES[current.weather_code] ?? "Unknown",
        localTime: current.time,
      };
    } catch (err) {
      console.error("getWeather tool error:", err);
      const timedOut = err instanceof Error && err.name === "TimeoutError";
      return { error: timedOut ? "Weather service timed out." : "Failed to fetch weather data." };
    }
  },
});

// Search result content is often noisy — markdown tables, mixed scripts
// from multilingual pages, excess whitespace. Feeding that straight back
// to the model bloats the next request and has been observed to trigger
// outright request failures from the provider. Clean it before returning.
function cleanSnippet(text: string, maxLen = 280): string {
  return text
    .replace(/\|/g, " ") // strip markdown table pipes
    .replace(/[^\x00-\x7F]+/g, " ") // strip non-ASCII (mixed scripts, emoji, etc.)
    .replace(/\s+/g, " ") // collapse whitespace/newlines
    .trim()
    .slice(0, maxLen);
}

// Tavily is purpose-built for feeding LLMs — it returns pre-summarized,
// structured results instead of raw HTML/links, which the model can work
// with directly. Free tier: 1,000 search credits.
export const webSearch = tool({
  description:
    "Search the live web for current information — news, facts, prices, sports results, or anything that may have happened or changed recently, or that you wouldn't reliably know. Use this whenever the answer depends on up-to-date information.",
  parameters: z.object({
    query: z.string().describe("A concise search query, e.g. 'latest iPhone release'"),
  }),
  execute: async ({ query }) => {
    if (!process.env.TAVILY_API_KEY) {
      return { error: "Web search is not configured (missing TAVILY_API_KEY)." };
    }
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query,
          max_results: 4,
          search_depth: "basic",
        }),
        signal: AbortSignal.timeout(10000),
      });
      const json = await res.json();
      if (!res.ok) {
        return { error: json?.detail ?? "Web search request failed." };
      }
      return {
        results: (json.results ?? []).map((r: { title: string; url: string; content?: string }) => ({
          title: cleanSnippet(r.title, 120),
          url: r.url,
          snippet: r.content ? cleanSnippet(r.content) : "",
        })),
      };
    } catch (err) {
      console.error("webSearch tool error:", err);
      const timedOut = err instanceof Error && err.name === "TimeoutError";
      return { error: timedOut ? "Web search timed out." : "Failed to perform web search." };
    }
  },
});
