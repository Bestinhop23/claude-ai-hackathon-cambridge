// stock-data edge function v3 – Claude primary, Polymarket, caching, linked sources
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ────────────────────────────────────────────────────────────
// DB Cache layer – uses api_cache table
// ────────────────────────────────────────────────────────────

function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

async function getCached(key: string): Promise<any | null> {
  try {
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from("api_cache")
      .select("data, expires_at")
      .eq("cache_key", key)
      .single();
    if (data && new Date(data.expires_at) > new Date()) {
      return data.data;
    }
    // Clean up expired
    if (data) {
      sb.from("api_cache").delete().eq("cache_key", key).then(() => {});
    }
  } catch {}
  return null;
}

async function setCache(key: string, data: any, ttlMinutes: number): Promise<void> {
  try {
    const sb = getSupabaseAdmin();
    const expires_at = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    await sb.from("api_cache").upsert({ cache_key: key, data, expires_at }, { onConflict: "cache_key" });
  } catch (e) {
    console.error("Cache write failed:", e);
  }
}

// ────────────────────────────────────────────────────────────
// AI helper – uses Lovable AI (no user key needed) with
// Anthropic fallback when ANTHROPIC_API_KEY is set.
// ────────────────────────────────────────────────────────────

async function callAI(systemPrompt: string, userPrompt: string, maxTokens = 1024): Promise<string | null> {
  // Primary: Anthropic Claude
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (anthropicKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data?.content?.[0]?.text || null;
      }
      console.error("Anthropic error:", res.status, await res.text());
    } catch (e) {
      console.error("Anthropic call failed:", e);
    }
  }

  // Fallback: Lovable AI gateway
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_completion_tokens: maxTokens,
          temperature: 0.3,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data?.choices?.[0]?.message?.content || null;
      }
      console.error("Lovable AI error:", res.status, await res.text());
    } catch (e) {
      console.error("Lovable AI call failed:", e);
    }
  }

  return null;
}

// Claude-only call (no fallback) for Polymarket
async function callClaude(systemPrompt: string, userPrompt: string, maxTokens = 1024): Promise<string | null> {
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    console.error("ANTHROPIC_API_KEY not set - Claude-only call failed");
    return null;
  }
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data?.content?.[0]?.text || null;
    }
    console.error("Claude error:", res.status, await res.text());
  } catch (e) {
    console.error("Claude call failed:", e);
  }
  return null;
}

function parseJSON(text: string | null): any {
  if (!text) return null;
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch { /* fallback */ }
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
  } catch { /* fallback */ }
  return null;
}

// ────────────────────────────────────────────────────────────
// Polymarket helpers
// ────────────────────────────────────────────────────────────

const POLY_NOISE_PATTERNS = [
  /\b(nfl|nba|mlb|nhl|ncaa|football|soccer|basketball|baseball|tennis|golf|f1|nascar|ufc|mma|boxing|wimbledon|super\s*bowl)\b/i,
  /\b(grammy|oscar|emmy|golden\s*globes|reality\s*show|love\s*is\s*blind|celebrity|influencer)\b/i,
  /\b(governor|mayor|house\s+seat|state\s+senate|primary\s+election|local\s+election)\b/i,
];

const GLOBAL_MACRO_KEYWORDS = [
  "tariff", "trade", "sanction", "war", "ceasefire", "oil", "gas", "opec", "inflation", "recession",
  "interest rate", "federal reserve", "fed", "gdp", "unemployment", "debt ceiling", "shutdown",
  "hurricane", "storm", "flood", "drought", "wildfire", "shipping", "supply chain", "regulation",
  "china", "taiwan", "iran", "russia", "ukraine", "red sea", "suez",
];

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasAnyKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

function isNoisyPolymarketQuestion(text: string): boolean {
  return POLY_NOISE_PATTERNS.some((rx) => rx.test(text));
}

function parseOutcomePrices(raw: any): number[] {
  if (Array.isArray(raw)) return raw.map((v) => toFiniteNumber(v));
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map((v: any) => toFiniteNumber(v)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizePolymarketMarket(m: any, query: string) {
  const id = String(m?.id ?? m?.condition_id ?? "");
  const question = String(m?.question || m?.title || "").trim();
  const slug = String(m?.slug || m?.market_slug || "").trim();
  return {
    id,
    question,
    description: String(m?.description || "").slice(0, 300),
    outcomePrices: m?.outcomePrices ?? m?.outcome_prices ?? [],
    outcomes: m?.outcomes ?? [],
    volume: toFiniteNumber(m?.volume ?? m?.volumeNum ?? 0),
    liquidity: toFiniteNumber(m?.liquidity ?? m?.liquidityNum ?? 0),
    endDate: String(m?.end_date_iso || m?.endDate || ""),
    active: m?.active ?? true,
    slug,
    url: slug ? `https://polymarket.com/event/${slug}` : `https://polymarket.com/search?query=${encodeURIComponent(query)}`,
    _searchTerm: query,
  };
}

function dedupeMarkets(markets: any[]) {
  const seen = new Set<string>();
  return markets.filter((m) => {
    const id = String(m?.id || "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

async function fetchPolymarketMarketsByQueries(queries: string[], limit = 6): Promise<any[]> {
  const settled = await Promise.allSettled(
    queries.map(async (query) => {
      try {
        const res = await fetch(
          `https://gamma-api.polymarket.com/markets?closed=false&limit=${limit}&search=${encodeURIComponent(query)}&order=volume&ascending=false`,
          { headers: { Accept: "application/json" } },
        );
        if (!res.ok) {
          await res.text();
          return [];
        }
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        return arr.map((m: any) => normalizePolymarketMarket(m, query));
      } catch {
        return [];
      }
    }),
  );

  const merged: any[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") merged.push(...r.value);
  }

  return dedupeMarkets(merged).sort((a, b) => (b.volume || 0) - (a.volume || 0));
}

function buildCompanyMacroKeywords(symbol: string, companyName: string, industry: string): string[] {
  const all = new Set<string>(GLOBAL_MACRO_KEYWORDS);
  const lowerIndustry = (industry || "").toLowerCase();

  const industryMap: Array<{ match: string[]; keywords: string[] }> = [
    {
      match: ["air freight", "courier", "logistics", "trucking", "transport"],
      keywords: ["shipping", "freight", "air cargo", "diesel", "jet fuel", "tariff", "trade war", "hurricane", "port strike", "supply chain"],
    },
    {
      match: ["aerospace", "defense"],
      keywords: ["defense spending", "war", "nato", "missile", "iran", "taiwan", "china", "russia", "ukraine", "sanctions"],
    },
    {
      match: ["semiconductor", "chip"],
      keywords: ["chip export", "taiwan", "tsmc", "china", "ai demand", "supply chain", "tariff"],
    },
    {
      match: ["oil", "energy", "gas"],
      keywords: ["oil price", "opec", "natural gas", "pipeline", "sanctions", "middle east", "hurricane"],
    },
    {
      match: ["pharma", "biotech", "healthcare"],
      keywords: ["fda", "drug pricing", "medicare", "patent", "clinical trial", "regulation"],
    },
    {
      match: ["financial", "bank", "insurance"],
      keywords: ["interest rate", "federal reserve", "credit", "default", "recession", "bank regulation"],
    },
  ];

  for (const entry of industryMap) {
    if (entry.match.some((m) => lowerIndustry.includes(m))) {
      entry.keywords.forEach((k) => all.add(k));
    }
  }

  const ticker = (symbol || "").toLowerCase();
  if (ticker) all.add(ticker);

  const companyTerms = (companyName || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4)
    .slice(0, 4);

  companyTerms.forEach((t) => all.add(t));
  return Array.from(all);
}

function scoreMarketRelevanceToCompany(market: any, keywords: string[]): number {
  const question = String(market?.question || "");
  const desc = String(market?.description || "");
  const text = `${question} ${desc}`.toLowerCase();

  let score = 0;
  if (isNoisyPolymarketQuestion(text)) score -= 8;
  if (hasAnyKeyword(text, GLOBAL_MACRO_KEYWORDS)) score += 2;

  for (const keyword of keywords) {
    if (text.includes(keyword.toLowerCase())) score += keyword.length > 8 ? 2 : 1;
  }

  const volume = toFiniteNumber(market?.volume);
  if (volume >= 500000) score += 2;
  else if (volume >= 100000) score += 1;

  return score;
}

function sanitizeQueryTerms(queries: string[], fallback: string[], max = 10): string[] {
  const cleaned = queries
    .map((q) => String(q || "").trim())
    .filter((q) => q.length >= 2 && q.length <= 48);

  const deduped = Array.from(new Set([...cleaned, ...fallback]));
  return deduped.slice(0, max);
}

// ────────────────────────────────────────────────────────────
// Yahoo Finance helpers
// ────────────────────────────────────────────────────────────

const YAHOO_BASE = "https://query1.finance.yahoo.com";

async function fetchChart(symbol: string, range: string, interval: string) {
  const url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=true`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Yahoo chart error [${res.status}] for ${symbol}`);
  return data;
}

function mapChartToSnapshot(data: any) {
  const result = data?.chart?.result?.[0];
  if (!result) return null;
  const meta = result.meta || {};
  const quote = result?.indicators?.quote?.[0] || {};
  const closes: number[] = quote.close || [];
  const opens: number[] = quote.open || [];
  const highs: number[] = quote.high || [];
  const lows: number[] = quote.low || [];
  const volumes: number[] = quote.volume || [];

  const price = Number(meta.regularMarketPrice ?? closes[closes.length - 1] ?? 0);
  const prevClose = Number(meta.chartPreviousClose ?? meta.previousClose ?? 0);
  const change = price - prevClose;
  const changePct = prevClose ? (change / prevClose) * 100 : 0;

  return {
    symbol: meta.symbol,
    shortName: meta.shortName,
    longName: meta.longName,
    regularMarketPrice: price,
    regularMarketChange: change,
    regularMarketChangePercent: changePct,
    regularMarketOpen: Number(meta.regularMarketOpen ?? opens[opens.length - 1] ?? 0),
    regularMarketDayHigh: Number(meta.regularMarketDayHigh ?? highs[highs.length - 1] ?? 0),
    regularMarketDayLow: Number(meta.regularMarketDayLow ?? lows[lows.length - 1] ?? 0),
    regularMarketVolume: Number(meta.regularMarketVolume ?? volumes[volumes.length - 1] ?? 0),
    regularMarketPreviousClose: prevClose,
    fiftyTwoWeekHigh: Number(meta.fiftyTwoWeekHigh ?? 0),
    fiftyTwoWeekLow: Number(meta.fiftyTwoWeekLow ?? 0),
    exchange: meta.fullExchangeName || meta.exchangeName,
    quoteType: meta.instrumentType,
    currency: meta.currency,
    marketCap: meta.marketCap ?? null,
    preMarketPrice: meta.preMarketPrice ?? null,
    preMarketChange: meta.preMarketChange ?? null,
    preMarketChangePercent: meta.preMarketChangePercent ?? null,
    postMarketPrice: meta.postMarketPrice ?? null,
    postMarketChange: meta.postMarketChange ?? null,
    postMarketChangePercent: meta.postMarketChangePercent ?? null,
    hasPrePostMarketData: meta.hasPrePostMarketData ?? false,
  };
}

// ────────────────────────────────────────────────────────────
// News – NewsAPI with Google News RSS fallback
// ────────────────────────────────────────────────────────────

async function fetchNewsAPI(query: string, pageSize = 10): Promise<any[]> {
  const newsKey = Deno.env.get("NEWSAPI_KEY");
  if (!newsKey) return [];
  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=${pageSize}&language=en&apiKey=${newsKey}`;
    const res = await fetch(url);
    if (!res.ok) { await res.text(); return []; }
    const data = await res.json();
    return data?.articles || [];
  } catch {
    return [];
  }
}

async function fetchGoogleNewsRSS(query: string, limit = 8): Promise<any[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) { await res.text(); return []; }
    const xml = await res.text();

    const articles: any[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && articles.length < limit) {
      const item = match[1];
      const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() || "";
      const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || "";
      const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || "";
      const source = item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() || "Google News";

      if (title) {
        articles.push({
          title,
          url: link,
          publishedAt: pubDate,
          source: { name: source },
          description: title,
          _source: "google-news-rss",
        });
      }
    }
    return articles;
  } catch {
    return [];
  }
}

async function fetchNews(query: string, pageSize = 10): Promise<any[]> {
  let articles = await fetchNewsAPI(query, pageSize);
  if (articles.length === 0) {
    articles = await fetchGoogleNewsRSS(query, pageSize);
  }
  return articles;
}

// ────────────────────────────────────────────────────────────
// Military detection for flights
// ────────────────────────────────────────────────────────────

const MIL_HEX = ["ae", "af", "43c", "3f", "3a"];
const MIL_CS = [
  "RCH", "DUKE", "EVAC", "REACH", "FORGE", "KING", "HAWK",
  "VIPER", "SNAKE", "COBRA", "WOLF", "TIGER", "BEARS", "DOOM",
  "RRR", "CNV", "NAV", "AE0", "TOPCAT", "DARK", "SPAR",
  "SAM", "VENUS", "NERO", "MOOSE", "TEAL", "BOXER", "ROCKY",
];
const MIL_TYPES = [
  "F16", "F18", "F15", "F22", "F35", "C17", "C130", "C5M", "C5",
  "KC10", "KC46", "KC135", "B1", "B2", "B52", "E3", "E6", "E8",
  "P8", "P3", "V22", "H60", "A10", "C40", "T38", "T6",
  "EUFI", "RFAL", "GROB", "HAWK", "TUCA", "TRNDO",
];

function isMilitary(f: any): boolean {
  const hex = (f.icao24 || "").toLowerCase();
  const cs = (f.callsign || "").toUpperCase().trim();
  const type = (f.type || "").toUpperCase();
  if (MIL_HEX.some(p => hex.startsWith(p))) return true;
  if (MIL_CS.some(p => cs.startsWith(p))) return true;
  if (MIL_TYPES.some(t => type.includes(t))) return true;
  if (f.squawk === "7777" || f.squawk === "0000") return true;
  return false;
}

// ────────────────────────────────────────────────────────────
// Ship type classification from AIS numeric type codes
// ────────────────────────────────────────────────────────────

function classifyShipType(typeCode: number | string): string {
  const code = Number(typeCode) || 0;
  if (code >= 70 && code <= 79) return "Cargo";
  if (code >= 80 && code <= 89) return "Tanker";
  if (code >= 60 && code <= 69) return "Passenger";
  if (code >= 40 && code <= 49) return "High-Speed Craft";
  if (code >= 30 && code <= 39) return "Fishing";
  if (code >= 50 && code <= 59) return "Special Craft";
  if (code >= 20 && code <= 29) return "Pilot/SAR";
  if (code === 0) return "Unknown";
  return String(typeCode);
}

function classifyShipStatus(status: number): string {
  const map: Record<number, string> = {
    0: "Underway (Engine)",
    1: "At Anchor",
    2: "Not Under Command",
    3: "Restricted Maneuverability",
    4: "Constrained by Draught",
    5: "Moored",
    6: "Aground",
    7: "Engaged in Fishing",
    8: "Under Way (Sailing)",
    15: "Not Defined",
  };
  return map[status] || `Status ${status}`;
}

// ────────────────────────────────────────────────────────────
// MAIN HANDLER
// ────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, params } = await req.json();

    // ─── CHART ───────────────────────────────────────────────
    if (action === "chart") {
      const { symbol, range = "1mo", interval = "1d" } = params;
      const data = await fetchChart(symbol, range, interval);
      return jsonResponse(data);
    }

    // ─── QUOTE ───────────────────────────────────────────────
    if (action === "quote") {
      const symbolsInput = params?.symbols;
      const symbols = Array.isArray(symbolsInput)
        ? symbolsInput
        : String(symbolsInput || "").split(",").map((s: string) => s.trim()).filter(Boolean);
      if (!symbols.length) return jsonResponse({ error: "No symbols" }, 400);

      const settled = await Promise.allSettled(
        symbols.map(async (s: string) => {
          const d = await fetchChart(s, "5d", "1d");
          return mapChartToSnapshot(d);
        }),
      );
      const result = settled
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && !!r.value)
        .map((r) => r.value);
      return jsonResponse({ quoteResponse: { result, error: null } });
    }

    // ─── SEARCH ──────────────────────────────────────────────
    if (action === "search") {
      const { q } = params;
      const url = `${YAHOO_BASE}/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`;
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } });
      const data = await res.json();
      if (!res.ok) return jsonResponse({ error: `Search error [${res.status}]` }, res.status);
      return jsonResponse(data);
    }

    // ─── EARNINGS (Finnhub) ──────────────────────────────────
    if (action === "earnings") {
      const { symbol } = params;
      const key = Deno.env.get("FINNHUB_API_KEY");
      if (!key) return jsonResponse({ earnings: [], error: "Finnhub API key not configured" });

      const res = await fetch(`https://finnhub.io/api/v1/stock/earnings?symbol=${encodeURIComponent(symbol)}&token=${key}`);
      const data = await res.json();
      const earnings = (Array.isArray(data) ? data : []).map((e: any) => ({
        date: e.period ? Math.floor(new Date(e.period).getTime() / 1000) : 0,
        epsActual: e.actual ?? null,
        epsEstimate: e.estimate ?? null,
        revenueActual: e.revenueActual ?? null,
        revenueEstimate: e.revenueEstimate ?? null,
        quarter: e.quarter ?? null,
      }));
      earnings.sort((a: any, b: any) => (b.date || 0) - (a.date || 0));
      return jsonResponse({ earnings });
    }

    // ─── COMPANY PROFILE (Finnhub) ──────────────────────────
    if (action === "company-profile") {
      const { symbol } = params;
      const key = Deno.env.get("FINNHUB_API_KEY");
      if (!key) return jsonResponse({ profile: null });

      const [profileRes, metricsRes, recRes, peersRes] = await Promise.all([
        fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${key}`),
        fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${key}`),
        fetch(`https://finnhub.io/api/v1/stock/recommendation?symbol=${symbol}&token=${key}`),
        fetch(`https://finnhub.io/api/v1/stock/peers?symbol=${symbol}&token=${key}`),
      ]);
      const [profile, metrics, recommendations, peers] = await Promise.all([
        profileRes.json(), metricsRes.json(), recRes.json(), peersRes.json(),
      ]);
      return jsonResponse({
        profile,
        metrics: metrics?.metric || {},
        recommendations: recommendations || [],
        peers: peers || [],
      });
    }

    // ─── NEWS (NewsAPI + Google News RSS fallback) ────────────
    if (action === "news") {
      const { symbol, companyName } = params;
      // Use company name + "stock" to avoid ambiguous ticker matches (e.g. "UPS" matching random articles)
      const query = companyName ? `"${companyName}" stock` : `${symbol} stock`;
      const articles = await fetchNews(query, 10);
      return jsonResponse({ articles });
    }

    // ─── SENTIMENT (AI-powered) ──────────────────────────────
    if (action === "sentiment") {
      const { symbol, articles } = params;

      const articleSummaries = (articles || []).slice(0, 8).map((a: any, i: number) =>
        `${i + 1}. "${a.title}" - ${a.description || "No description"}`
      ).join("\n");

      if (!articleSummaries) {
        return jsonResponse({ sentiment: null, error: "No articles provided" });
      }

      const text = await callAI(
        "You are a financial sentiment analyst. Respond ONLY with valid JSON, no markdown.",
        `Analyze the sentiment for stock ${symbol} based on these recent news articles:\n\n${articleSummaries}\n\nProvide:\n1. Overall sentiment: BULLISH, BEARISH, or NEUTRAL\n2. Confidence score: 0-100\n3. A concise 2-3 sentence summary of the market sentiment\n4. Key factors (3-5 bullet points)\n5. Risk assessment: LOW, MEDIUM, or HIGH\n\nRespond in JSON: { "sentiment": "BULLISH"|"BEARISH"|"NEUTRAL", "confidence": number, "summary": "...", "factors": ["..."], "risk": "LOW"|"MEDIUM"|"HIGH" }`,
      );

      const parsed = parseJSON(text);
      return jsonResponse({ sentiment: parsed, raw: text });
    }

    // ─── EXCHANGE RATES ──────────────────────────────────────
    if (action === "exchange-rates") {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await res.json();
        return jsonResponse({ rates: data?.rates || {} });
      } catch {
        return jsonResponse({ rates: { USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.5, JPY: 149.5, CAD: 1.36, AUD: 1.53, CHF: 0.88 } });
      }
    }

    // ─── FLIGHTS (ADSB.lol) ──────────────────────────────────
    if (action === "flights") {
      try {
        const regions = [
          { lat: 40, lon: -95, dist: 250 },
          { lat: 50, lon: 5, dist: 250 },
          { lat: 35, lon: 120, dist: 250 },
          { lat: 25, lon: 55, dist: 200 },
          { lat: -25, lon: 135, dist: 200 },
          { lat: 20, lon: 80, dist: 200 },
        ];

        const results = await Promise.allSettled(
          regions.map(async (r) => {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 12000);
            try {
              const res = await fetch(
                `https://api.adsb.lol/v2/lat/${r.lat}/lon/${r.lon}/dist/${r.dist}`,
                { headers: { Accept: "application/json" }, signal: ctrl.signal },
              );
              clearTimeout(t);
              if (!res.ok) { await res.text(); return []; }
              const data = await res.json();
              return (data?.ac || [])
                .filter((a: any) => a.lat != null && a.lon != null)
                .map((a: any) => {
                  const flight = {
                    icao24: a.hex || "",
                    callsign: (a.flight || a.r || "").trim(),
                    originCountry: "—",
                    longitude: a.lon,
                    latitude: a.lat,
                    altitude: Math.round(a.alt_baro === "ground" ? 0 : (a.alt_baro || a.alt_geom || 0) * 0.3048),
                    velocity: Math.round((a.gs || 0) * 0.514444),
                    heading: a.track || a.true_heading || 0,
                    verticalRate: a.baro_rate ? Math.round(a.baro_rate * 0.00508) : 0,
                    geoAltitude: Math.round((a.alt_geom || 0) * 0.3048),
                    squawk: a.squawk || "",
                    registration: a.r || "",
                    type: a.t || "",
                    military: false,
                    category: a.category || "",
                  };
                  flight.military = isMilitary(flight);
                  return flight;
                });
            } catch {
              clearTimeout(t);
              return [];
            }
          }),
        );

        const allFlights: any[] = [];
        const seen = new Set<string>();
        for (const r of results) {
          if (r.status === "fulfilled") {
            for (const f of r.value) {
              if (f.icao24 && !seen.has(f.icao24)) {
                seen.add(f.icao24);
                allFlights.push(f);
              }
            }
          }
        }

        return jsonResponse({ flights: allFlights, time: Math.floor(Date.now() / 1000) });
      } catch (e) {
        return jsonResponse({ flights: [], time: Math.floor(Date.now() / 1000), error: String(e) });
      }
    }

    // ─── SHIPS (Digitraffic AIS with enriched type classification) ──
    if (action === "ships") {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 12000);

        try {
          const res = await fetch("https://meri.digitraffic.fi/api/ais/v1/locations", {
            headers: { Accept: "application/json" },
            signal: ctrl.signal,
          });
          clearTimeout(t);

          if (res.ok) {
            const data = await res.json();
            const ships = (data?.features || []).slice(0, 600).map((f: any) => {
              const props = f.properties || {};
              const coords = f.geometry?.coordinates || [];
              return {
                mmsi: String(props.mmsi || f.mmsi || ""),
                name: props.name || "Unknown Vessel",
                longitude: coords[0] ?? props.lon ?? 0,
                latitude: coords[1] ?? props.lat ?? 0,
                heading: props.heading ?? props.cog ?? 0,
                speed: props.sog ?? 0,
                type: classifyShipType(props.shipType ?? 0),
                destination: props.destination || "",
                flag: props.countryCode || "",
                status: props.navStat ?? 0,
                statusText: classifyShipStatus(props.navStat ?? 15),
                timestamp: props.timestampExternal ?? Date.now(),
              };
            });
            return jsonResponse({ ships });
          }
        } catch {
          clearTimeout(t);
        }

        // Fallback: simulated ship data on major shipping lanes
        const lanes = [
          { lat: 50.5, lon: 0, r: 1, n: 30, area: "English Channel" },
          { lat: 1.5, lon: 102, r: 2, n: 25, area: "Malacca Strait" },
          { lat: 30, lon: 33, r: 2, n: 20, area: "Suez Canal" },
          { lat: 9, lon: -79, r: 1, n: 15, area: "Panama Canal" },
          { lat: 15, lon: 114, r: 5, n: 25, area: "South China Sea" },
          { lat: 38, lon: 18, r: 8, n: 20, area: "Mediterranean" },
          { lat: 36, lon: -70, r: 5, n: 20, area: "US East Coast" },
        ];
        const types = ["Cargo", "Tanker", "Container", "Bulk Carrier", "LNG Carrier", "Passenger", "Fishing", "Tug"];
        const flags = ["Panama", "Liberia", "Marshall Islands", "Hong Kong", "Singapore", "Malta", "Bahamas", "Greece"];

        const ships: any[] = [];
        for (const lane of lanes) {
          for (let i = 0; i < lane.n; i++) {
            const idx = ships.length;
            ships.push({
              mmsi: String(200000000 + idx * 1000 + Math.floor(Math.random() * 999)),
              name: `${types[idx % types.length]} ${String.fromCharCode(65 + (idx % 26))}${Math.floor(Math.random() * 999)}`,
              longitude: lane.lon + (Math.random() - 0.5) * lane.r * 2,
              latitude: lane.lat + (Math.random() - 0.5) * lane.r * 2,
              heading: Math.floor(Math.random() * 360),
              speed: 5 + Math.random() * 20,
              type: types[idx % types.length],
              destination: lane.area,
              flag: flags[idx % flags.length],
              status: Math.random() > 0.8 ? 1 : 0,
              statusText: Math.random() > 0.8 ? "At Anchor" : "Underway (Engine)",
            });
          }
        }
        return jsonResponse({ ships, source: "simulated" });
      } catch (e) {
        return jsonResponse({ ships: [], error: String(e) });
      }
    }

    // ─── RELEVANT NEWS (AI topic generation + multi-source fetch) ──
    if (action === "relevant-news") {
      const { symbol, companyName } = params;

      // Generate search queries using AI
      const text = await callAI(
        "You are a financial analyst. Respond ONLY with a JSON array of strings.",
        `For the stock ${symbol} (${companyName || symbol}), generate exactly 4 search queries that would find news about macro events, geopolitical risks, supply chain disruptions, regulatory changes, or industry trends that could materially impact this stock's price. Think like an insider - shipping crises, oil prices, trade wars, semiconductor shortages, regulatory actions, competitive threats. Return ONLY a JSON array of 4 strings.`,
        256,
      );

      let queries: string[] = [];
      const parsed = parseJSON(text);
      if (Array.isArray(parsed)) queries = parsed;

      if (queries.length === 0) {
        queries = [
          `${symbol} supply chain disruption`,
          `${symbol} regulatory risk`,
          `global trade impact ${companyName || symbol}`,
          `${symbol} industry competition threat`,
        ];
      }

      // Fetch news for each query
      const newsResults = await Promise.allSettled(
        queries.slice(0, 4).map(async (q) => {
          const articles = await fetchNews(q, 3);
          return articles.map((a: any) => ({ ...a, _query: q }));
        }),
      );

      const articles: any[] = [];
      const seen = new Set<string>();
      for (const r of newsResults) {
        if (r.status === "fulfilled") {
          for (const a of r.value) {
            if (a.title && !seen.has(a.title)) {
              seen.add(a.title);
              articles.push(a);
            }
          }
        }
      }

      return jsonResponse({ articles, queries });
    }

    // ─── WEATHER (NWS) ──────────────────────────────────────
    if (action === "weather") {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 10000);
        const res = await fetch(
          "https://api.weather.gov/alerts/active?status=actual&severity=Extreme,Severe&limit=50",
          {
            headers: { "User-Agent": "FinTrack/1.0 (fintrack@example.com)", Accept: "application/geo+json" },
            signal: ctrl.signal,
          },
        );
        clearTimeout(t);

        if (!res.ok) { await res.text(); return jsonResponse({ alerts: [] }); }

        const data = await res.json();
        const alerts = (data?.features || []).slice(0, 50).map((f: any) => {
          const props = f.properties || {};
          let lat = 38, lon = -97;
          if (f.geometry?.coordinates) {
            const coords = f.geometry.type === "Point"
              ? [f.geometry.coordinates]
              : f.geometry.type === "Polygon"
                ? f.geometry.coordinates[0]
                : f.geometry.coordinates?.flat?.(2) || [];
            const valid = coords.filter((c: any) => Array.isArray(c) && c.length >= 2);
            if (valid.length > 0) {
              lon = valid.reduce((s: number, c: any) => s + c[0], 0) / valid.length;
              lat = valid.reduce((s: number, c: any) => s + c[1], 0) / valid.length;
            }
          }
          return {
            id: props.id || String(Math.random()),
            event: props.event || "Unknown",
            severity: props.severity || "Moderate",
            headline: props.headline || "",
            description: (props.description || "").slice(0, 500),
            latitude: lat,
            longitude: lon,
            areaDesc: props.areaDesc || "",
            onset: props.onset || null,
            expires: props.expires || null,
            effective: props.effective || null,
          };
        });
        return jsonResponse({ alerts });
      } catch (e) {
        return jsonResponse({ alerts: [], error: String(e) });
      }
    }

    // ─── STOCK IMPACT (AI market impact for unusual events) ──
    if (action === "stock-impact") {
      const { eventType, description } = params;

      const text = await callAI(
        "You are a financial analyst specializing in event-driven equity impact. Respond ONLY with valid JSON.",
        `Given this ${eventType} event:\n\n${description}\n\nIdentify 3-5 publicly traded US stocks most affected. For each, state whether impact is POSITIVE or NEGATIVE with a 1-sentence reason.\n\nAlso provide a 2-sentence summary of overall market impact.\n\nReturn JSON: { "stocks": [{ "symbol": "TICKER", "name": "Company Name", "impact": "POSITIVE"|"NEGATIVE", "reason": "..." }], "summary": "..." }`,
      );

      return jsonResponse({ impact: parseJSON(text) });
    }

    // ─── DEEP ANALYSIS — cached 120min per stock ──
    if (action === "deep-analysis") {
      const { symbol, companyName, profile } = params;
      const name = companyName || symbol;
      const industry = profile?.finnhubIndustry || "Unknown";

      const cacheKey = `deep-analysis-${symbol}-v1`;
      const cached = await getCached(cacheKey);
      if (cached) {
        console.log(`[deep-analysis] ${symbol}: returning cached result`);
        return jsonResponse(cached);
      }

      const text = await callAI(
        `You are an elite institutional equity research analyst with deep expertise in supply chain analysis, macro-event impact modeling, and competitive dynamics. You produce Bloomberg-terminal grade intelligence. CRITICAL: For every claim, include a source URL where possible (SEC filings, Reuters, Bloomberg, company IR pages, government sites). Respond ONLY with valid JSON.`,
        `Produce a comprehensive deep analysis for ${symbol} (${name}), industry: ${industry}.

Analyze ALL of the following dimensions. IMPORTANT: Include "sourceUrl" fields with real, verifiable URLs for claims when possible (e.g. SEC EDGAR links, Reuters articles, government regulation pages, company investor relations).

1. SUPPLY CHAIN: Map upstream and downstream. Include sourceUrl for key suppliers/distributors if known.
2. VERTICAL INTEGRATION: Owned vs outsourced.
3. HORIZONTAL COMPETITION: Direct competitors with sourceUrl links to their IR pages.
4. WEATHER & CLIMATE RISKS: Specific events with sourceUrl to NOAA/climate reports if applicable.
5. GEOPOLITICAL RISKS: With sourceUrl to relevant government/regulatory pages.
6. PREDICTION MARKET SIGNALS: What would prediction markets price? Include sourceUrl like "https://polymarket.com/search?query=${encodeURIComponent(symbol)}" where relevant.
7. MACRO SENSITIVITY: Interest rates, inflation, USD, oil etc.
8. KEY CATALYSTS: With sourceUrl to SEC filings, earnings calendars, regulatory dockets.

Return JSON:
{
  "supplyChain": {
    "upstream": [{ "category": "...", "keyPlayers": ["..."], "risk": "HIGH|MEDIUM|LOW", "notes": "...", "sourceUrl": "..." }],
    "downstream": [{ "category": "...", "keyPlayers": ["..."], "risk": "HIGH|MEDIUM|LOW", "notes": "...", "sourceUrl": "..." }],
    "criticalDependencies": ["..."],
    "singlePointsOfFailure": ["..."]
  },
  "verticalIntegration": {
    "owned": ["..."],
    "outsourced": ["..."],
    "expansionOpportunities": ["..."],
    "integrationScore": "HIGH|MEDIUM|LOW"
  },
  "horizontalCompetition": {
    "directCompetitors": [{ "symbol": "...", "name": "...", "threatLevel": "HIGH|MEDIUM|LOW", "notes": "...", "sourceUrl": "..." }],
    "marketPosition": "...",
    "moats": ["..."]
  },
  "weatherClimateRisks": [{ "event": "...", "probability": "HIGH|MEDIUM|LOW", "impact": "...", "affectedOperations": "...", "sourceUrl": "..." }],
  "geopoliticalRisks": [{ "risk": "...", "severity": "HIGH|MEDIUM|LOW", "exposure": "...", "mitigants": "...", "sourceUrl": "..." }],
  "predictionMarketSignals": [{ "outcome": "...", "impliedProbability": "65%", "timeframe": "...", "reasoning": "...", "sourceUrl": "..." }],
  "macroSensitivity": [{ "factor": "...", "sensitivity": "HIGH|MEDIUM|LOW", "direction": "POSITIVE|NEGATIVE|MIXED", "notes": "...", "sourceUrl": "..." }],
  "catalysts": [{ "event": "...", "date": "...", "impact": "HIGH|MEDIUM|LOW", "direction": "BULLISH|BEARISH|UNCERTAIN", "sourceUrl": "..." }],
  "overallRiskScore": "1-10",
  "executiveBrief": "3-4 sentence institutional-grade summary"
}`,
        4000,
      );

      const result = { analysis: parseJSON(text) };
      await setCache(cacheKey, result, 120);
      return jsonResponse(result);
    }

    // ─── POLYMARKET (Claude-ranked, stock-specific relevance) — cached 30min per stock ──
    if (action === "polymarket") {
      const { symbol, companyName, profile } = params;
      const name = companyName || symbol;
      const industry = profile?.finnhubIndustry || "";
      const weburl = profile?.weburl || "";

      const cacheKey = `polymarket-${symbol}-v3`;
      const cached = await getCached(cacheKey);
      if (cached?.markets?.length >= 2) {
        console.log(`[polymarket] ${symbol}: returning cached result`);
        return jsonResponse(cached);
      }

      try {
        const defaultQueries = [
          "tariff",
          "trade war",
          "oil price",
          "hurricane",
          "supply chain",
          "recession",
          "interest rate",
          "sanctions",
        ];

        const queryPrompt = [
          `Company: ${symbol} (${name})`,
          `Industry: ${industry || "Unknown"}`,
          `Website: ${weburl || "N/A"}`,
          "",
          "Return JSON as:",
          '{ "queries": ["...", "..."] }',
          "",
          "Rules:",
          `- Return 8 concise search queries (2-4 words each) for EXTERNAL events that would move ${symbol} by at least ±3%.`,
          "- Focus on macro/geopolitical/weather/regulatory/commodity events.",
          "- Never include sports, entertainment, celebrities, or local election races.",
          "- Include at least one weather/climate query and one war/geopolitical query where relevant to this industry.",
        ].join("\n");

        const generatedTermsText = await callClaude(
          "You are a macro event query generator for equity analysis. Return ONLY valid JSON.",
          queryPrompt,
          260,
        );

        const generatedParsed = parseJSON(generatedTermsText);
        const generatedQueries = Array.isArray(generatedParsed)
          ? generatedParsed
          : Array.isArray(generatedParsed?.queries)
            ? generatedParsed.queries
            : [];

        const searchTerms = sanitizeQueryTerms(generatedQueries, defaultQueries, 10);
        console.log(`[polymarket] ${symbol}: search terms ${JSON.stringify(searchTerms)}`);

        const rawMarkets = await fetchPolymarketMarketsByQueries(searchTerms, 8);
        if (rawMarkets.length === 0) {
          const emptyResult = { markets: [], queries: searchTerms, searchUrl: "https://polymarket.com" };
          await setCache(cacheKey, emptyResult, 15);
          return jsonResponse(emptyResult);
        }

        const companyKeywords = buildCompanyMacroKeywords(symbol, name, industry);

        const scored = rawMarkets
          .map((market) => ({
            ...market,
            _detScore: scoreMarketRelevanceToCompany(market, companyKeywords),
          }))
          .filter((market) => market._detScore > 0 && !isNoisyPolymarketQuestion(`${market.question} ${market.description}`))
          .sort((a, b) => (b._detScore - a._detScore) || (b.volume - a.volume));

        const shortlist = (scored.length > 0 ? scored : rawMarkets)
          .slice(0, 18);

        if (shortlist.length === 0) {
          const emptyResult = { markets: [], queries: searchTerms, searchUrl: "https://polymarket.com" };
          await setCache(cacheKey, emptyResult, 15);
          return jsonResponse(emptyResult);
        }

        const shortlistText = shortlist.map((m: any, i: number) => {
          const prices = parseOutcomePrices(m.outcomePrices);
          const yes = prices.length > 0 ? `${(toFiniteNumber(prices[0]) * 100).toFixed(0)}%` : "?";
          return `${i + 1}. ${m.question} | YES=${yes} | Vol=$${Math.round((m.volume || 0) / 1000)}K | Query=${m._searchTerm || "n/a"}`;
        }).join("\n");

        const rankingPrompt = [
          `Stock: ${symbol} (${name})`,
          `Industry: ${industry || "Unknown"}`,
          "",
          "From the candidate prediction markets below, pick ONLY 2-3 markets that are most materially relevant to this stock.",
          "",
          "Reject anything in sports, entertainment, celebrity, and local election races.",
          "Only keep markets where the outcome has a direct, plausible revenue/cost/supply-chain impact on this company.",
          "",
          "Return JSON:",
          "{",
          '  "picks": [',
          '    { "index": 1, "relevance": 0-100, "reason": "max 18 words" }',
          "  ]",
          "}",
          "",
          "Candidates:",
          shortlistText,
        ].join("\n");

        const rankingText = await callClaude(
          "You are a strict equity relevance filter. Return ONLY valid JSON.",
          rankingPrompt,
          400,
        );

        const rankingParsed = parseJSON(rankingText);
        const aiPicks = Array.isArray(rankingParsed?.picks) ? rankingParsed.picks : [];

        const aiSelected = aiPicks
          .filter((p: any) => Number.isFinite(Number(p?.index)))
          .map((p: any) => ({
            market: shortlist[Math.max(0, Number(p.index) - 1)],
            relevance: toFiniteNumber(p?.relevance),
          }))
          .filter((row: any) => row.market)
          .sort((a: any, b: any) => b.relevance - a.relevance)
          .slice(0, 3)
          .map((row: any) => row.market);

        const fallbackSelected = shortlist.slice(0, 3);
        const finalMarkets = dedupeMarkets((aiSelected.length >= 2 ? aiSelected : fallbackSelected))
          .slice(0, 3)
          .map((m: any) => {
            const { _detScore, ...clean } = m;
            return clean;
          });

        const result = {
          markets: finalMarkets,
          queries: searchTerms,
          searchUrl: finalMarkets[0]?.url || `https://polymarket.com/search?query=${encodeURIComponent(searchTerms[0] || symbol)}`,
        };

        await setCache(cacheKey, result, 30);
        return jsonResponse(result);
      } catch (e) {
        return jsonResponse({ markets: [], queries: [], error: String(e), searchUrl: "https://polymarket.com" });
      }
    }

    // ─── POLYMARKET SUMMARY (AI analysis of prediction markets for a stock) — cached 60min ──
    if (action === "polymarket-summary") {
      const { symbol, companyName, markets, profile } = params;
      const name = companyName || symbol;
      const industry = profile?.finnhubIndustry || "";

      const cacheKey = `polysummary-${symbol}-${(markets || []).length}-v1`;
      const cached = await getCached(cacheKey);
      if (cached) return jsonResponse(cached);

      const marketsSummary = (markets || []).slice(0, 5).map((m: any, i: number) => {
        let prices: any[] = [];
        try { prices = typeof m.outcomePrices === "string" ? JSON.parse(m.outcomePrices) : m.outcomePrices || []; } catch {}
        const yesPrice = prices[0] ? `${(parseFloat(prices[0]) * 100).toFixed(0)}%` : "?";
        return `${i + 1}. "${m.question}" (YES: ${yesPrice}, Vol: $${Math.round((m.volume || 0) / 1000)}K)`;
      }).join("\n");

      if (!marketsSummary) {
        return jsonResponse({ summary: null });
      }

      const text = await callAI(
        "You are a senior equity analyst who translates prediction market signals into actionable stock intelligence. Be specific about dollar amounts, percentages, and causal chains. Respond ONLY with valid JSON.",
        `Analyze how these prediction markets DIRECTLY impact ${symbol} (${name}, industry: ${industry}):

${marketsSummary}

For each market, trace the SPECIFIC causal chain: prediction market outcome → how it affects ${symbol}'s revenue/costs/operations → expected stock price impact direction and rough magnitude.

Be concrete. Example: "A 73% probability of new tariffs on Chinese goods would increase FedEx's international shipping costs by ~8-12%, pressuring margins on their Express segment which represents 47% of revenue."

Return JSON:
{
  "summary": "2-3 sentence executive summary with specific numbers linking prediction market probabilities to stock impact",
  "bullishFactors": ["1-2 specific bullish signals with causal chains and numbers"],
  "bearishFactors": ["1-2 specific bearish signals with causal chains and numbers"],
  "overallImpact": "BULLISH" | "BEARISH" | "NEUTRAL"
}`,
        1200,
      );

      const parsed = parseJSON(text);
      const summaryResult = { summary: parsed };
      await setCache(cacheKey, summaryResult, 60);
      return jsonResponse(summaryResult);
    }


    if (action === "research") {
      const { symbol, companyName, query } = params;
      const topic = query || `${symbol} ${companyName || ""} investment outlook`;

      const text = await callAI(
        "You are a senior equity research analyst. Produce structured research findings. Respond ONLY with valid JSON.",
        `Produce research findings for: ${topic}\n\nFocus tickers: ${symbol}\n\nProvide:\n1. overview: 2-3 sentence macro/sector context\n2. findings: array of 4-6 findings, each with:\n   - topic: short label\n   - takeaway: 1-2 sentence key insight\n   - impactOnAssets: how this affects the stock(s)\n   - whyItMatters: relevance for investors\n   - confidence: HIGH, MEDIUM, or LOW\n3. catalysts: array of 2-3 upcoming events/catalysts\n\nReturn JSON: { "overview": "...", "findings": [...], "catalysts": [...] }`,
        1500,
      );

      const parsed = parseJSON(text);
      return jsonResponse({ research: parsed, raw: text });
    }

    // ─── ANALYZE (Orchestrator – structured investment brief) — cached 30min ──
    if (action === "analyze") {
      const { symbol, companyName, theme } = params;
      const cacheKey = `analyze-${symbol || theme}-v1`;
      const cached = await getCached(cacheKey);
      if (cached) {
        console.log(`[analyze] ${symbol}: returning cached result`);
        return jsonResponse(cached);
      }
      const ticker = symbol || theme || "SPY";
      const name = companyName || ticker;

      // 1. Fetch market data, news, and fundamentals in parallel
      const [quoteResult, newsResult, profileResult, earningsResult] = await Promise.allSettled([
        fetchChart(ticker, "1mo", "1d").then(mapChartToSnapshot).catch(() => null),
        fetchNews(`"${name}" OR "${ticker}"`, 8),
        (async () => {
          const key = Deno.env.get("FINNHUB_API_KEY");
          if (!key) return null;
          const res = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${key}`);
          return res.ok ? await res.json() : null;
        })(),
        (async () => {
          const key = Deno.env.get("FINNHUB_API_KEY");
          if (!key) return [];
          const res = await fetch(`https://finnhub.io/api/v1/stock/earnings?symbol=${ticker}&token=${key}`);
          const data = await res.json();
          return Array.isArray(data) ? data.slice(0, 4) : [];
        })(),
      ]);

      const quote = quoteResult.status === "fulfilled" ? quoteResult.value : null;
      const news = newsResult.status === "fulfilled" ? newsResult.value : [];
      const profile = profileResult.status === "fulfilled" ? profileResult.value : null;
      const earnings = earningsResult.status === "fulfilled" ? earningsResult.value : [];

      // 2. Build context for AI
      const priceCtx = quote
        ? `Price: $${quote.regularMarketPrice}, Change: ${quote.regularMarketChangePercent?.toFixed(2)}%, 52W High: $${quote.fiftyTwoWeekHigh}, 52W Low: $${quote.fiftyTwoWeekLow}, Vol: ${quote.regularMarketVolume?.toLocaleString()}`
        : "Price data unavailable";

      const newsCtx = news.slice(0, 6).map((a: any, i: number) =>
        `${i + 1}. "${a.title}" (${a.source?.name || "Unknown"})`
      ).join("\n");

      const profileCtx = profile
        ? `Industry: ${profile.finnhubIndustry || "N/A"}, Market Cap: ${profile.marketCapitalization ? `$${(profile.marketCapitalization / 1000).toFixed(1)}B` : "N/A"}, Country: ${profile.country || "N/A"}`
        : "";

      const earningsCtx = earnings.length > 0
        ? `Recent earnings: ${earnings.slice(0, 2).map((e: any) => `Q${e.quarter}: EPS actual ${e.actual ?? "N/A"} vs est ${e.estimate ?? "N/A"}`).join("; ")}`
        : "";

      // 3. Generate structured brief via AI
      const briefText = await callAI(
        "You are a senior investment analyst producing structured briefs. Be evidence-based, cite uncertainty, preserve user agency. Respond ONLY with valid JSON.",
        `Produce a structured investment brief for ${ticker} (${name}).\n\nMarket data: ${priceCtx}\n${profileCtx}\n${earningsCtx}\n\nRecent headlines:\n${newsCtx || "None available"}\n\nProvide JSON with:\n{\n  "executiveSummary": "2-3 sentence overview",\n  "trendOverview": { "direction": "UP"|"DOWN"|"SIDEWAYS", "strength": "STRONG"|"MODERATE"|"WEAK", "description": "1 sentence" },\n  "drivers": ["2-4 key price drivers"],\n  "opportunities": ["2-3 potential opportunities"],\n  "risks": ["2-3 key risks"],\n  "catalysts": [{ "event": "...", "expectedDate": "...", "potentialImpact": "..." }],\n  "uncertainty": "1-2 sentences on what is unclear",\n  "whatToWatch": ["2-3 things to monitor"]\n}`,
        1500,
      );

      const brief = parseJSON(briefText);

      // 4. Generate sentiment summary
      let sentiment = null;
      if (news.length > 0) {
        const sentimentText = await callAI(
          "You are a sentiment analyst. Respond ONLY with valid JSON.",
          `For ${ticker}: given these headlines:\n${newsCtx}\n\nReturn JSON: { "sentiment": "BULLISH"|"BEARISH"|"NEUTRAL", "confidence": 0-100, "summary": "1-2 sentences" }`,
          256,
        );
        sentiment = parseJSON(sentimentText);
      }

      const analyzeResult = {
        brief,
        quote,
        news: news.slice(0, 8),
        profile,
        earnings,
        sentiment,
        dataStatus: {
          quote: !!quote,
          news: news.length > 0,
          profile: !!profile,
          earnings: earnings.length > 0,
          aiAvailable: true,
        },
      };

      await setCache(cacheKey, analyzeResult, 30);
      return jsonResponse(analyzeResult);
    }

    // ─── MARKET MOVERS (Top Winners / Losers) ──────────────
    if (action === "market-movers") {
      const watchlist = [
        "AAPL","MSFT","GOOGL","AMZN","NVDA","TSLA","META","JPM",
        "V","UNH","XOM","JNJ","WMT","PG","MA","HD","BAC","KO",
        "PFE","MRK","ABBV","COST","PEP","TMO","AVGO","LLY","ORCL",
        "NFLX","AMD","CRM","INTC","CSCO","ACN","QCOM","TXN","NOW",
        "AMAT","ADBE","PYPL","DIS","NKE","MCD","LOW","CAT","GS",
        "BA","RTX","DE","UPS","FDX",
      ];
      const settled = await Promise.allSettled(
        watchlist.map(async (s) => {
          const d = await fetchChart(s, "5d", "1d");
          return mapChartToSnapshot(d);
        }),
      );
      const all = settled
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && !!r.value)
        .map((r) => r.value);
      const sorted = [...all].sort((a, b) => (b.regularMarketChangePercent || 0) - (a.regularMarketChangePercent || 0));
      const winners = sorted.slice(0, 8);
      const losers = sorted.slice(-8).reverse(); // worst first
      return jsonResponse({ winners, losers });
    }

    // ─── MARKET PICKS (AI contextual picks with news) ──────
    if (action === "market-picks") {
      // 1. Get macro headlines
      const macroNews = await fetchNews("stock market today economy", 8);
      const headlines = macroNews.slice(0, 6).map((a: any, i: number) =>
        `${i + 1}. "${a.title}" – ${a.source?.name || "Unknown"}`
      ).join("\n");

      // 2. Ask AI for picks based on current context
      const text = await callAI(
        "You are a senior macro strategist. Respond ONLY with valid JSON.",
        `Given today's top market headlines:\n${headlines || "No headlines available"}\n\nIdentify exactly 6 US-listed stocks that are most relevant RIGHT NOW given the current macro context. For each:\n- symbol: ticker\n- name: company name\n- thesis: 1-sentence why this is relevant now (cite the specific news/event)\n- direction: "BULLISH" or "BEARISH" (your lean)\n- newsTitle: the headline that makes this relevant\n- newsSource: source name\n\nReturn JSON: { "picks": [...], "macro": "1-2 sentence macro summary" }`,
        1200,
      );

      const parsed = parseJSON(text);
      const picks = parsed?.picks || [];
      const macro = parsed?.macro || "";

      // 3. Fetch live quotes for the picked symbols
      const symbols = picks.map((p: any) => p.symbol).filter(Boolean);
      let quotes: any[] = [];
      if (symbols.length > 0) {
        const qSettled = await Promise.allSettled(
          symbols.map(async (s: string) => {
            const d = await fetchChart(s, "5d", "1d");
            return mapChartToSnapshot(d);
          }),
        );
        quotes = qSettled
          .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && !!r.value)
          .map((r) => r.value);
      }

      // Merge quotes into picks
      const quotesMap: Record<string, any> = {};
      quotes.forEach((q) => { if (q.symbol) quotesMap[q.symbol] = q; });
      const enrichedPicks = picks.map((p: any) => ({
        ...p,
        quote: quotesMap[p.symbol] || null,
      }));

      return jsonResponse({ picks: enrichedPicks, macro, headlines: macroNews.slice(0, 6) });
    }

    // ─── MARKET INSIGHTS (Claude-ranked macro market to equity map) — cached 60min ──
    if (action === "market-insights") {
      const cacheKey = "market-insights-v2";
      const cached = await getCached(cacheKey);
      if (cached?.markets?.length >= 4 && (cached?.winners?.length || cached?.losers?.length)) {
        console.log("[market-insights] returning cached result");
        return jsonResponse(cached);
      }

      try {
        const searchQueries = [
          "tariff",
          "trade war",
          "oil price",
          "opec",
          "federal reserve",
          "interest rate",
          "inflation",
          "recession",
          "unemployment",
          "debt ceiling",
          "government shutdown",
          "china taiwan",
          "iran",
          "ukraine",
          "sanctions",
          "hurricane",
          "drought",
          "shipping disruption",
          "supply chain",
        ];

        const allMarkets = await fetchPolymarketMarketsByQueries(searchQueries, 6);
        if (allMarkets.length === 0) {
          const emptyResult = {
            winners: [],
            losers: [],
            markets: [],
            summary: "No actionable macro prediction markets found right now.",
            searchUrl: "https://polymarket.com",
          };
          await setCache(cacheKey, emptyResult, 20);
          return jsonResponse(emptyResult);
        }

        const macroCandidates = allMarkets
          .filter((m) => {
            const text = `${m.question} ${m.description}`.toLowerCase();
            return hasAnyKeyword(text, GLOBAL_MACRO_KEYWORDS) && !isNoisyPolymarketQuestion(text);
          })
          .slice(0, 30);

        const candidatePool = (macroCandidates.length > 0 ? macroCandidates : allMarkets).slice(0, 30);

        const candidateListText = candidatePool.map((m: any, i: number) => {
          const prices = parseOutcomePrices(m.outcomePrices);
          const yes = prices.length > 0 ? `${(toFiniteNumber(prices[0]) * 100).toFixed(0)}%` : "?";
          return `${i + 1}. ${m.question} | YES=${yes} | Vol=$${Math.round((m.volume || 0) / 1000)}K`;
        }).join("\n");

        const selectPrompt = [
          "Choose the 8-10 most globally relevant macro/geopolitical prediction markets for broad US stock impact.",
          "",
          "Reject sports, entertainment, celebrity, and local election races.",
          "",
          "Return JSON:",
          '{ "indices": [1,2,3], "summary": "one short sentence" }',
          "",
          "Markets:",
          candidateListText,
        ].join("\n");

        const selectText = await callAI(
          "You are a strict macro relevance ranker for equities. Return ONLY valid JSON.",
          selectPrompt,
          350,
        );

        const selectedParsed = parseJSON(selectText);
        const pickedIndices = Array.isArray(selectedParsed?.indices) ? selectedParsed.indices : [];

        const selectedMarkets = dedupeMarkets(
          pickedIndices
            .map((i: any) => candidatePool[Math.max(0, Number(i) - 1)])
            .filter(Boolean),
        ).slice(0, 10);

        const marketsForInsights = (selectedMarkets.length >= 6 ? selectedMarkets : candidatePool.slice(0, 10));

        const summaryInput = marketsForInsights.map((m: any, i: number) => {
          const prices = parseOutcomePrices(m.outcomePrices);
          const yes = prices.length > 0 ? `${(toFiniteNumber(prices[0]) * 100).toFixed(0)}%` : "?";
          return `${i + 1}. "${m.question}" (YES ${yes}, Vol $${Math.round((m.volume || 0) / 1000)}K)`;
        }).join("\n");

        const insightsPrompt = [
          "Using these LIVE prediction markets, identify equity winners and losers with causal links.",
          "",
          summaryInput,
          "",
          "Return JSON:",
          "{",
          '  "winners": [{ "symbol": "...", "name": "...", "thesis": "1-2 sentences with causal chain", "relevantMarket": "exact market", "impliedProbability": "YES %" }],',
          '  "losers": [{ "symbol": "...", "name": "...", "thesis": "1-2 sentences with causal chain", "relevantMarket": "exact market", "impliedProbability": "YES %" }],',
          '  "summary": "2-3 sentence macro narrative"',
          "}",
          "",
          "Provide 3-5 winners and 3-5 losers. Keep it specific and practical.",
        ].join("\n");

        const insightsText = await callAI(
          "You are a top-down macro equity strategist. Return ONLY valid JSON.",
          insightsPrompt,
          1900,
        );

        let parsed = parseJSON(insightsText);
        let winners = Array.isArray(parsed?.winners) ? parsed.winners.slice(0, 6) : [];
        let losers = Array.isArray(parsed?.losers) ? parsed.losers.slice(0, 6) : [];
        let summary = parsed?.summary || selectedParsed?.summary || "";

        // Retry once with a tighter schema if Claude returns empty structure
        if (winners.length === 0 && losers.length === 0) {
          const retryPrompt = [
            "From these prediction markets:",
            summaryInput,
            "",
            "Return JSON with exactly this shape:",
            '{ "winners": [{"symbol":"","name":"","thesis":"","relevantMarket":"","impliedProbability":""}], "losers": [{"symbol":"","name":"","thesis":"","relevantMarket":"","impliedProbability":""}], "summary": "" }',
            "",
            "Provide at least 2 winners and 2 losers.",
          ].join("\n");

          const retryText = await callAI(
            "Return ONLY valid JSON and include non-empty arrays.",
            retryPrompt,
            1200,
          );
          parsed = parseJSON(retryText);
          winners = Array.isArray(parsed?.winners) ? parsed.winners.slice(0, 6) : winners;
          losers = Array.isArray(parsed?.losers) ? parsed.losers.slice(0, 6) : losers;
          summary = parsed?.summary || summary;
        }

        const result = {
          winners,
          losers,
          summary: summary || "Prediction markets are mixed, but macro risk remains elevated across rates, trade, and geopolitical channels.",
          markets: marketsForInsights,
          searchUrl: marketsForInsights[0]?.url || "https://polymarket.com",
        };

        await setCache(cacheKey, result, 60);
        return jsonResponse(result);
      } catch (e) {
        return jsonResponse({ winners: [], losers: [], markets: [], summary: "", error: String(e) });
      }
    }

    // ─── GLOBAL NEWS (top headlines + AI stock impact) ─────
    if (action === "global-news") {
      const cacheKey = "global-news-v1";
      const cached = await getCached(cacheKey);
      if (cached) return jsonResponse(cached);

      const newsKey = Deno.env.get("NEWSAPI_KEY");
      let articles: any[] = [];
      if (newsKey) {
        try {
          const res = await fetch(`https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=20&apiKey=${newsKey}`);
          if (res.ok) {
            const data = await res.json();
            articles = data?.articles || [];
          }
        } catch {}
      }
      if (articles.length === 0) {
        articles = await fetchGoogleNewsRSS("global economy markets", 20);
      }

      // AI: generate stock impact for top articles
      const headlinesList = articles.slice(0, 12).map((a: any, i: number) =>
        `${i + 1}. "${a.title}" (${a.source?.name || "Unknown"})`
      ).join("\n");

      let impacts: any[] = [];
      if (headlinesList) {
        const text = await callAI(
          "You are a senior macro equity strategist. For each news headline, identify 1-2 most impacted US-listed stocks with ticker symbols and explain the impact direction. Respond ONLY with valid JSON.",
          `Analyze these business headlines and identify which US stocks are most impacted by each:\n\n${headlinesList}\n\nReturn JSON:\n[\n  {\n    "headlineIndex": 1,\n    "stocks": [\n      { "symbol": "TICKER", "name": "Company Name", "impact": "POSITIVE"|"NEGATIVE", "reason": "1 sentence why" }\n    ]\n  }\n]`,
          2000,
        );
        const parsed = parseJSON(text);
        if (Array.isArray(parsed)) impacts = parsed;
      }

      // Merge impacts into articles
      const enriched = articles.slice(0, 12).map((a: any, i: number) => {
        const impact = impacts.find((im: any) => im.headlineIndex === i + 1);
        return { ...a, stockImpact: impact?.stocks || [] };
      });

      const result = { articles: enriched };
      await setCache(cacheKey, result, 15);
      return jsonResponse(result);
    }

    // ─── SEC FILINGS (EDGAR + AI summaries) ─────────────────
    if (action === "sec-filings") {
      const { symbol } = params;
      const cacheKey = `sec-filings-${symbol}-v1`;
      const cached = await getCached(cacheKey);
      if (cached) return jsonResponse(cached);

      // 1. Get CIK from SEC
      let cik = "";
      try {
        const res = await fetch(`https://efts.sec.gov/LATEST/search-index?q=%22${symbol}%22&dateRange=custom&startdt=2020-01-01&forms=10-K,10-Q,8-K`, {
          headers: { "User-Agent": "FinTrack support@fintrack.app", Accept: "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          const hits = data?.hits?.hits || [];
          if (hits.length > 0) {
            cik = hits[0]?._source?.file_num?.replace(/-/g, "") || "";
          }
        }
      } catch {}

      // Try ticker-to-CIK mapping
      if (!cik) {
        try {
          const res = await fetch("https://www.sec.gov/files/company_tickers.json", {
            headers: { "User-Agent": "FinTrack support@fintrack.app" },
          });
          if (res.ok) {
            const data = await res.json();
            for (const key of Object.keys(data)) {
              if (data[key]?.ticker?.toUpperCase() === symbol.toUpperCase()) {
                cik = String(data[key].cik_str);
                break;
              }
            }
          }
        } catch {}
      }

      let filings: any[] = [];
      if (cik) {
        const paddedCik = cik.padStart(10, "0");
        try {
          const res = await fetch(`https://data.sec.gov/submissions/CIK${paddedCik}.json`, {
            headers: { "User-Agent": "FinTrack support@fintrack.app", Accept: "application/json" },
          });
          if (res.ok) {
            const data = await res.json();
            const recent = data?.filings?.recent || {};
            const forms = recent.form || [];
            const dates = recent.filingDate || [];
            const accessions = recent.accessionNumber || [];
            const descriptions = recent.primaryDocDescription || [];
            const docs = recent.primaryDocument || [];

            for (let i = 0; i < Math.min(forms.length, 10); i++) {
              const form = forms[i];
              if (["10-K", "10-Q", "8-K", "S-1", "DEF 14A", "20-F", "6-K"].includes(form)) {
                const accNum = accessions[i]?.replace(/-/g, "");
                filings.push({
                  form,
                  filingDate: dates[i],
                  description: descriptions[i] || form,
                  url: `https://www.sec.gov/Archives/edgar/data/${cik}/${accNum}/${docs[i]}`,
                  accessionNumber: accessions[i],
                });
              }
              if (filings.length >= 10) break;
            }
          }
        } catch {}
      }

      // If no filings found, try EDGAR full-text search as fallback
      if (filings.length === 0) {
        try {
          const res = await fetch(`https://efts.sec.gov/LATEST/search-index?q=%22${symbol}%22&forms=10-K,10-Q,8-K&dateRange=custom&startdt=2023-01-01`, {
            headers: { "User-Agent": "FinTrack support@fintrack.app", Accept: "application/json" },
          });
          if (res.ok) {
            const data = await res.json();
            const hits = data?.hits?.hits || [];
            filings = hits.slice(0, 10).map((h: any) => ({
              form: h._source?.form_type || "Unknown",
              filingDate: h._source?.file_date || "",
              description: h._source?.display_names?.[0] || h._source?.form_type || "",
              url: `https://www.sec.gov/Archives/edgar/data/${h._source?.entity_id || ""}/${(h._source?.file_num || "").replace(/-/g, "")}`,
              accessionNumber: h._id || "",
            }));
          }
        } catch {}
      }

      // AI summaries for filings
      let summaries: string[] = [];
      if (filings.length > 0) {
        const filingsList = filings.map((f: any, i: number) =>
          `${i + 1}. ${f.form} filed ${f.filingDate}: ${f.description}`
        ).join("\n");

        const text = await callAI(
          "You are an SEC filing analyst. For each filing, provide a concise 1-2 sentence summary of what the filing likely contains and its significance for investors. Respond ONLY with valid JSON.",
          `Stock: ${symbol}\n\nFilings:\n${filingsList}\n\nReturn JSON array of strings with one summary per filing:\n["summary1", "summary2", ...]`,
          1500,
        );
        const parsed = parseJSON(text);
        if (Array.isArray(parsed)) summaries = parsed;
      }

      const enrichedFilings = filings.map((f: any, i: number) => ({
        ...f,
        summary: summaries[i] || "Summary not available",
      }));

      const result = { filings: enrichedFilings, cik };
      await setCache(cacheKey, result, 60);
      return jsonResponse(result);
    }

    // ─── SATELLITES ──────────────────────────────────────────
    if (action === "satellites") {
      const satellites: any[] = [];

      try {
        const res = await fetch("https://api.wheretheiss.at/v1/satellites/25544", {
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const d = await res.json();
          satellites.push({
            id: "ISS", name: "International Space Station (ISS)",
            latitude: d.latitude, longitude: d.longitude,
            altitude: d.altitude, velocity: d.velocity,
            type: "station", inclination: 51.6,
          });
        }
      } catch { /* noop */ }

      const now = Date.now() / 1000;
      const sats = [
        { id: "HST", name: "Hubble Space Telescope", alt: 540, incl: 28.5, period: 5700, raan: 120 },
        { id: "SL-1001", name: "Starlink-1001", alt: 550, incl: 53, period: 5760, raan: 45 },
        { id: "SL-1002", name: "Starlink-1002", alt: 550, incl: 53, period: 5760, raan: 46 },
        { id: "SL-2001", name: "Starlink-2001", alt: 550, incl: 53, period: 5760, raan: 135 },
        { id: "GPS-IIF1", name: "GPS IIF-1 (NAVSTAR 65)", alt: 20200, incl: 55, period: 43080, raan: 0 },
        { id: "GPS-IIF2", name: "GPS IIF-2 (NAVSTAR 66)", alt: 20200, incl: 55, period: 43080, raan: 60 },
        { id: "GPS-IIF3", name: "GPS IIF-3 (NAVSTAR 67)", alt: 20200, incl: 55, period: 43080, raan: 120 },
        { id: "GOES16", name: "GOES-16 (Weather)", alt: 35786, incl: 0.1, period: 86164, raan: 0 },
        { id: "GOES18", name: "GOES-18 (Weather)", alt: 35786, incl: 0.1, period: 86164, raan: 60 },
      ];

      for (const s of sats) {
        const theta = (2 * Math.PI * (now % s.period)) / s.period;
        const iRad = s.incl * Math.PI / 180;
        const lat = Math.asin(Math.sin(theta) * Math.sin(iRad)) * 180 / Math.PI;
        const lon = ((Math.atan2(Math.sin(theta) * Math.cos(iRad), Math.cos(theta)) * 180 / Math.PI)
          - ((now % 86164) / 86164) * 360 + s.raan + 720) % 360 - 180;

        satellites.push({
          id: s.id, name: s.name,
          latitude: lat, longitude: lon,
          altitude: s.alt,
          velocity: 2 * Math.PI * (6371 + s.alt) / (s.period / 3600),
          type: s.alt > 30000 ? "geo" : s.alt > 10000 ? "meo" : "leo",
          inclination: s.incl,
        });
      }

      return jsonResponse({ satellites });
    }

    return jsonResponse({ error: "Unknown action: " + action }, 400);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Stock data error:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
