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
  // Primary: Anthropic Claude (fast haiku model)
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

    // ─── DEEP ANALYSIS (Supply chain, weather, predictions, verticals) ──
    if (action === "deep-analysis") {
      const { symbol, companyName, profile } = params;
      const name = companyName || symbol;
      const industry = profile?.finnhubIndustry || "Unknown";

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

      return jsonResponse({ analysis: parseJSON(text) });
    }

    // ─── POLYMARKET (Real prediction market data) ────────────
    if (action === "polymarket") {
      const { symbol, companyName, profile } = params;
      const name = companyName || symbol;
      const industry = profile?.finnhubIndustry || "";
      const weburl = profile?.weburl || "";
      
      try {
        // Step 1: AI generates VERY specific search terms tied to the company's actual operations
        const searchTermsText = await callAI(
          "You generate search queries for Polymarket prediction markets. Return ONLY a JSON array of 3-5 strings. NO explanation.",
          `Company: ${symbol} (${name})
Industry: ${industry}
Website: ${weburl}

I need Polymarket search queries that find prediction markets whose outcomes would DIRECTLY and MATERIALLY impact this specific company's stock price.

CRITICAL RULES:
- DO NOT search for the company name or ticker — Polymarket has no markets about individual stocks
- DO NOT use generic terms like "economy" or "market" — be SPECIFIC
- Think about what SPECIFIC external events would move this stock ±5% or more

For a LOGISTICS company (like UPS/FedEx): search "oil price", "tariff China", "hurricane", "trade war", "diesel fuel"
For a DEFENSE company (like RTX/LMT): search "Ukraine war", "NATO", "defense spending", "Iran"
For a PHARMA company (like PFE/MRK): search "FDA approval", "drug pricing", "Medicare"
For a TECH company (like MSFT/GOOG): search "AI regulation", "antitrust", "TikTok ban"
For a BANK (like JPM/GS): search "interest rate", "recession", "bank regulation"

Now generate 3-5 search terms for ${symbol} (${name}, ${industry}):`,
          200,
        );

        let searchTerms: string[] = [];
        try {
          const parsed = JSON.parse(searchTermsText || "[]");
          searchTerms = Array.isArray(parsed) ? parsed.slice(0, 5) : [];
        } catch {
          // Industry-specific fallback
          if (industry.toLowerCase().includes("transport") || industry.toLowerCase().includes("logist")) {
            searchTerms = ["tariff", "oil price", "hurricane", "trade war"];
          } else if (industry.toLowerCase().includes("defense") || industry.toLowerCase().includes("aero")) {
            searchTerms = ["war", "NATO", "defense spending"];
          } else {
            searchTerms = ["tariff", "recession", "interest rate"];
          }
        }

        console.log(`[polymarket] ${symbol}: searching with terms: ${JSON.stringify(searchTerms)}`);

        const allMarkets: any[] = [];
        
        // Fetch in parallel for speed
        const fetches = searchTerms.map(async (term) => {
          try {
            const res = await fetch(
              `https://gamma-api.polymarket.com/markets?closed=false&limit=5&search=${encodeURIComponent(term)}&order=volume&ascending=false`,
              { headers: { Accept: "application/json" } }
            );
            if (res.ok) {
              const data = await res.json();
              return (Array.isArray(data) ? data : []).map((m: any) => ({
                id: m.id || m.condition_id,
                question: m.question || m.title || "",
                description: (m.description || "").slice(0, 300),
                outcomePrices: m.outcomePrices || m.outcome_prices || [],
                outcomes: m.outcomes || [],
                volume: Number(m.volume ?? m.volumeNum ?? 0) || 0,
                liquidity: Number(m.liquidity ?? m.liquidityNum ?? 0) || 0,
                endDate: m.end_date_iso || m.endDate || "",
                active: m.active ?? true,
                slug: m.slug || m.market_slug || "",
                url: m.slug ? `https://polymarket.com/event/${m.slug}` : `https://polymarket.com/search?query=${encodeURIComponent(term)}`,
                _searchTerm: term,
              }));
            }
            await res.text();
            return [];
          } catch { return []; }
        });
        
        const results = await Promise.all(fetches);
        results.forEach(r => allMarkets.push(...r));
        
        // Deduplicate by id
        const seen = new Set<string>();
        const unique = allMarkets.filter(m => {
          if (!m.id || seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });

        console.log(`[polymarket] ${symbol}: found ${unique.length} unique markets`);

        if (unique.length === 0) {
          return jsonResponse({ markets: [], queries: searchTerms, searchUrl: `https://polymarket.com` });
        }

        // Step 2: AI picks ONLY the 2-3 most directly relevant — MUST reject irrelevant ones
        const marketsForFilter = unique.slice(0, 25).map((m: any, i: number) => {
          let prices: any[] = [];
          try { prices = typeof m.outcomePrices === "string" ? JSON.parse(m.outcomePrices) : m.outcomePrices || []; } catch {}
          const yesPrice = prices[0] ? `${(parseFloat(prices[0]) * 100).toFixed(0)}%` : "?";
          return `${i + 1}. "${m.question}" (YES: ${yesPrice}, Vol: $${Math.round((m.volume || 0) / 1000)}K)`;
        }).join("\n");

        const filterText = await callAI(
          "You are an expert stock analyst. You MUST be extremely selective. Return ONLY a JSON array of integers, or an empty array [] if NOTHING is relevant. NO explanation.",
          `Company: ${symbol} (${name}), Industry: ${industry}

Pick ONLY markets where the outcome would DIRECTLY affect ${symbol}'s revenue, costs, supply chain, or operations by ≥5%.

REJECT markets about:
- Sports, entertainment, elections (unless the company IS in that industry)
- Generic macro events with no specific link to this company
- Anything where you can't explain in ONE sentence how the outcome moves ${symbol}'s stock

Markets:
${marketsForFilter}

Return JSON array of 1-indexed numbers of the 1-3 MOST relevant, or [] if none qualify: `,
          80,
        );

        console.log(`[polymarket] ${symbol}: filter response: ${filterText}`);

        try {
          const indices = JSON.parse(filterText || "[]");
          if (Array.isArray(indices) && indices.length > 0) {
            const filtered = indices
              .map((i: number) => unique[i - 1])
              .filter(Boolean)
              .slice(0, 3);
            if (filtered.length > 0) {
              return jsonResponse({ 
                markets: filtered, 
                queries: searchTerms,
                searchUrl: `https://polymarket.com/search?query=${encodeURIComponent(searchTerms[0] || symbol)}` 
              });
            }
          }
        } catch {}

        // If AI filter returned nothing or failed, return EMPTY — don't show irrelevant garbage
        return jsonResponse({ markets: [], queries: searchTerms, searchUrl: `https://polymarket.com` });
      } catch (e) {
        return jsonResponse({ markets: [], queries: [], error: String(e), searchUrl: `https://polymarket.com` });
      }
    }

    // ─── POLYMARKET SUMMARY (AI analysis of prediction markets for a stock) ──
    if (action === "polymarket-summary") {
      const { symbol, companyName, markets, profile } = params;
      const name = companyName || symbol;
      const industry = profile?.finnhubIndustry || "";

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
      return jsonResponse({ summary: parsed });
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

    // ─── ANALYZE (Orchestrator – structured investment brief) ──
    if (action === "analyze") {
      const { symbol, companyName, theme } = params;
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

      return jsonResponse({
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
      });
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

    // ─── MARKET INSIGHTS (Polymarket-driven stock analysis) — cached 60min ──
    if (action === "market-insights") {
      const cacheKey = "market-insights-v1";
      const cached = await getCached(cacheKey);
      if (cached) {
        console.log("[market-insights] returning cached result");
        return jsonResponse(cached);
      }

      try {
        const allMarkets: any[] = [];
        
        // Search for high-impact macro/geopolitical markets that directly affect equities
        const searchQueries = [
          "tariff", "recession", "Federal Reserve rate", "S&P 500",
          "oil price", "China trade", "inflation", "NATO", "war",
          "sanctions", "GDP", "unemployment", "government shutdown",
          "debt ceiling", "OPEC production"
        ];
        
        // Parallel fetch all search queries
        const fetchResults = await Promise.allSettled(
          searchQueries.map(async (q) => {
            try {
              const res = await fetch(
                `https://gamma-api.polymarket.com/markets?closed=false&limit=3&search=${encodeURIComponent(q)}&order=volume&ascending=false`,
                { headers: { Accept: "application/json" } }
              );
              if (res.ok) {
                const data = await res.json();
                return (Array.isArray(data) ? data : []).map((m: any) => ({
                  id: m.id,
                  question: m.question || m.title || "",
                  description: (m.description || "").slice(0, 200),
                  outcomePrices: m.outcomePrices || "[]",
                  outcomes: m.outcomes || "[]",
                  volume: Number(m.volume ?? m.volumeNum ?? 0) || 0,
                  slug: m.slug || "",
                  url: m.slug ? `https://polymarket.com/event/${m.slug}` : `https://polymarket.com`,
                  endDate: m.end_date_iso || m.endDate || "",
                }));
              }
              await res.text();
              return [];
            } catch { return []; }
          })
        );
        
        for (const r of fetchResults) {
          if (r.status === "fulfilled") allMarkets.push(...r.value);
        }

        // Dedupe and sort by volume
        const seen = new Set<string>();
        const unique = allMarkets.filter(m => {
          if (!m.id || seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        }).sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 20);

        // Ask AI to identify stock winners/losers with detailed thesis
        const marketSummary = unique.slice(0, 12).map((m: any, i: number) => {
          let prices: any[] = [];
          try { prices = typeof m.outcomePrices === "string" ? JSON.parse(m.outcomePrices) : m.outcomePrices; } catch {}
          const yesPrice = prices[0] ? `${(parseFloat(prices[0]) * 100).toFixed(0)}%` : "?";
          return `${i + 1}. "${m.question}" (YES: ${yesPrice}, Vol: $${Math.round((m.volume || 0) / 1000)}K)`;
        }).join("\n");

        const text = await callAI(
          "You are an elite macro strategist at a top hedge fund. You translate prediction market probabilities into specific, actionable equity trades with detailed causal reasoning. Respond ONLY with valid JSON.",
          `These are LIVE prediction markets with real money behind them:

${marketSummary}

Identify stocks that would be DIRECTLY and MATERIALLY affected if these outcomes materialize. Focus on the highest-volume, highest-conviction markets.

For each stock pick:
- Trace the SPECIFIC causal chain from the prediction market outcome to the stock's revenue/costs
- Include rough magnitude of impact (e.g., "could reduce revenue by ~5-10%")
- Reference the specific prediction market probability

Return JSON:
{
  "winners": [{ "symbol": "...", "name": "...", "thesis": "2-3 sentence detailed thesis with specific numbers and causal chain from the prediction market to stock impact", "relevantMarket": "the exact prediction market question", "impliedProbability": "the YES price" }],
  "losers": [{ "symbol": "...", "name": "...", "thesis": "2-3 sentence detailed thesis with specific numbers and causal chain", "relevantMarket": "the exact prediction market question", "impliedProbability": "the YES price" }],
  "summary": "3-4 sentence macro overview synthesizing the key signals from prediction markets into an investment narrative"
}

Provide 4-6 winners and 4-6 losers. Be specific and quantitative.`,
          2500,
        );

        const parsed = parseJSON(text);
        const result = {
          winners: parsed?.winners || [],
          losers: parsed?.losers || [],
          summary: parsed?.summary || "",
          markets: unique.slice(0, 10),
          searchUrl: "https://polymarket.com",
        };

        // Cache for 60 minutes
        await setCache(cacheKey, result, 60);

        return jsonResponse(result);
      } catch (e) {
        return jsonResponse({ winners: [], losers: [], markets: [], summary: "", error: String(e) });
      }
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

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Stock data error:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
