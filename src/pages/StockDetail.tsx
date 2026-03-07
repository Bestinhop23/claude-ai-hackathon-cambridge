import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Activity, Sun, Moon as MoonIcon, BarChart3, Newspaper,
  TrendingUp, TrendingDown, Zap, Shield, Globe, Building2, Cloud,
  Target, AlertTriangle, Loader2, ExternalLink, Search, Sparkles,
  ArrowUpRight, ArrowDownRight, Link2, Factory, Truck, Users,
  Crosshair, MapPin, Calendar, DollarSign, Briefcase, Phone, Bot,
} from "lucide-react";
import { useQuote, useCompanyProfile, useEarnings, useAnalysis, useDeepAnalysis, useNews, useRelevantNews, useSentiment, usePolymarket, usePolymarketSummary, useSecFilings } from "@/hooks/useStockData";
import RiskDisclaimer from "@/components/RiskDisclaimer";
import { useCurrency } from "@/contexts/CurrencyContext";
import StockChart from "@/components/StockChart";
import StockLogo from "@/components/StockLogo";
import ThemeToggle from "@/components/ThemeToggle";
import CurrencySelector from "@/components/CurrencySelector";
import StockSearch from "@/components/StockSearch";
import { Skeleton } from "@/components/ui/skeleton";

/* ── Claude branding ────────────────────────────────────── */
const CLAUDE_ORANGE = "#D97757";
const ClaudeLogo = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="6" fill={CLAUDE_ORANGE} />
    <path d="M16.5 8.5L12 16L7.5 8.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const ClaudeBadge = ({ label }: { label?: string }) => (
  <span className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: `${CLAUDE_ORANGE}15`, color: CLAUDE_ORANGE, border: `1px solid ${CLAUDE_ORANGE}30` }}>
    <ClaudeLogo size={10} />{label || "Claude AI"}
  </span>
);

/* ── Polymarket Logo ────────────────────────────────────── */
const PolymarketLogo = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#0052FF"/>
    <text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white">P</text>
  </svg>
);

/* ── Helpers ────────────────────────────────────────────── */
const riskColor = (level: string) => {
  const l = (level || "").toUpperCase();
  if (l === "HIGH") return "text-stock-down bg-stock-down/10";
  if (l === "MEDIUM") return "text-amber-500 bg-amber-500/10";
  return "text-stock-up bg-stock-up/10";
};
const dirColor = (d: string) => {
  const l = (d || "").toUpperCase();
  if (l === "BULLISH" || l === "POSITIVE") return "text-stock-up";
  if (l === "BEARISH" || l === "NEGATIVE") return "text-stock-down";
  return "text-muted-foreground";
};

const SourceLink = ({ url, label }: { url?: string; label?: string }) => {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 text-[8px] text-primary hover:underline mt-0.5">
      <ExternalLink className="h-2 w-2" />{label || "Source"}
    </a>
  );
};

const Section = ({ icon: Icon, title, children, loading, className = "", badge }: {
  icon: any; title: string; children: React.ReactNode; loading?: boolean; className?: string; badge?: React.ReactNode;
}) => (
  <div className={`bg-card border border-border rounded-lg overflow-hidden ${className}`}>
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-secondary/30">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</h3>
      {badge}
      {loading && <Loader2 className="h-3 w-3 animate-spin text-primary ml-auto" />}
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const Metric = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null;
  return (
    <div>
      <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="font-mono text-xs font-medium text-foreground">{value}</p>
    </div>
  );
};

/* ── Parse polymarket prices (may be string or array) ──── */
function parsePolyPrices(raw: any): number[] {
  if (!raw) return [];
  let arr = raw;
  if (typeof raw === "string") {
    try { arr = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(arr)) return [];
  return arr.map((v: any) => {
    const n = parseFloat(v);
    return Number.isNaN(n) ? 0 : n;
  });
}

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = parseFloat(String(value ?? 0));
  return Number.isFinite(parsed) ? parsed : 0;
}

/* ── Tab button ─────────────────────────────────────────── */
const TabBtn = ({ active, label, icon: Icon, onClick, customIcon }: { active: boolean; label: string; icon?: any; onClick: () => void; customIcon?: React.ReactNode }) => (
  <button onClick={onClick} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
    active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
  }`}>
    {customIcon || (Icon && <Icon className="h-3.5 w-3.5" />)}{label}
  </button>
);

/* ── Main page ──────────────────────────────────────────── */
const StockDetail = () => {
  const { symbol = "" } = useParams();
  const upperSymbol = symbol.toUpperCase();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"overview" | "fundamentals" | "deep" | "news" | "polymarket" | "sec">("overview");

  const { data: quote, isLoading } = useQuote(upperSymbol);
  const { convert, symbol: currSym } = useCurrency();
  const { data: profileData, isLoading: profileLoading } = useCompanyProfile(upperSymbol);
  const { data: earnings, isLoading: earningsLoading } = useEarnings(upperSymbol);
  const { data: analysisData, isLoading: analysisLoading } = useAnalysis(upperSymbol, quote?.shortName || quote?.longName);
  const { data: deepData, isLoading: deepLoading } = useDeepAnalysis(upperSymbol, quote?.shortName || quote?.longName, profileData?.profile);
  const { data: articles = [], isLoading: newsLoading } = useNews(upperSymbol, quote?.shortName || quote?.longName);
  const { data: relevantData, isLoading: relevantLoading } = useRelevantNews(upperSymbol, quote?.shortName || quote?.longName);
  const { data: polyData, isLoading: polyLoading } = usePolymarket(upperSymbol, quote?.shortName || quote?.longName, profileData?.profile);
  const { data: polySummary, isLoading: polySummaryLoading } = usePolymarketSummary(upperSymbol, quote?.shortName || quote?.longName, polyData?.markets || [], profileData?.profile);
  const { data: sentimentData, isLoading: sentimentLoading } = useSentiment(upperSymbol, articles);
  const { data: secData, isLoading: secLoading } = useSecFilings(upperSymbol);

  const isPositive = (quote?.regularMarketChange ?? 0) >= 0;
  const [displayPrice, setDisplayPrice] = useState<number | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevPrice = useRef<number | null>(null);

  useEffect(() => {
    if (quote?.regularMarketPrice != null) {
      const converted = convert(quote.regularMarketPrice);
      setDisplayPrice(converted);
      prevPrice.current = converted;
    }
  }, [quote?.regularMarketPrice, convert]);

  useEffect(() => {
    if (quote?.regularMarketPrice == null) return;
    const base = convert(quote.regularMarketPrice);
    const interval = setInterval(() => {
      const jitter = base * (Math.random() - 0.5) * 0.0004;
      const newPrice = base + jitter;
      const dir = newPrice > (prevPrice.current ?? base) ? "up" : "down";
      setDisplayPrice(newPrice);
      setFlash(dir);
      prevPrice.current = newPrice;
      setTimeout(() => setFlash(null), 200);
    }, 800 + Math.random() * 600);
    return () => clearInterval(interval);
  }, [quote?.regularMarketPrice, convert]);

  const profile = profileData?.profile;
  const metrics = profileData?.metrics || {};
  const recommendations = profileData?.recommendations || [];
  const peers = profileData?.peers || [];
  const brief = analysisData?.brief;
  const deep = deepData;
  const relevantArticles = relevantData?.articles || [];
  const relevantQueries = relevantData?.queries || [];
  const polyMarkets = polyData?.markets || [];
  const polySearchUrl = polyData?.searchUrl || "";
  const pastEarnings = (earnings || []).filter((e: any) => e.epsActual != null).slice(0, 6);
  const hasPreMarket = quote?.preMarketPrice != null;
  const hasPostMarket = quote?.postMarketPrice != null;
  const latestRec = recommendations[0];

  const marketData = [
    { label: "Open", value: quote?.regularMarketOpen ? `${currSym}${convert(quote.regularMarketOpen).toFixed(2)}` : undefined },
    { label: "High", value: quote?.regularMarketDayHigh ? `${currSym}${convert(quote.regularMarketDayHigh).toFixed(2)}` : undefined },
    { label: "Low", value: quote?.regularMarketDayLow ? `${currSym}${convert(quote.regularMarketDayLow).toFixed(2)}` : undefined },
    { label: "Prev Close", value: quote?.regularMarketPreviousClose ? `${currSym}${convert(quote.regularMarketPreviousClose).toFixed(2)}` : undefined },
    { label: "Volume", value: quote?.regularMarketVolume?.toLocaleString() },
    { label: "52W High", value: quote?.fiftyTwoWeekHigh ? `${currSym}${convert(quote.fiftyTwoWeekHigh).toFixed(2)}` : undefined },
    { label: "52W Low", value: quote?.fiftyTwoWeekLow ? `${currSym}${convert(quote.fiftyTwoWeekLow).toFixed(2)}` : undefined },
    { label: "Exchange", value: quote?.exchange },
  ];
  const valuation = [
    { label: "P/E (TTM)", value: metrics["peBasicExclExtraTTM"]?.toFixed(2) },
    { label: "Forward P/E", value: metrics["peExclExtraAnnual"]?.toFixed(2) },
    { label: "P/B", value: metrics["pbAnnual"]?.toFixed(2) },
    { label: "P/S (TTM)", value: metrics["psTTM"]?.toFixed(2) },
    { label: "EV/EBITDA", value: metrics["enterpriseValueOverEBITDATTM"]?.toFixed(2) },
    { label: "PEG Ratio", value: metrics["pegAnnual"]?.toFixed(2) },
  ];
  const profitability = [
    { label: "ROE", value: metrics["roeTTM"] ? `${metrics["roeTTM"].toFixed(1)}%` : undefined },
    { label: "ROA", value: metrics["roaTTM"] ? `${metrics["roaTTM"].toFixed(1)}%` : undefined },
    { label: "Gross Margin", value: metrics["grossMarginTTM"] ? `${metrics["grossMarginTTM"].toFixed(1)}%` : undefined },
    { label: "Op Margin", value: metrics["operatingMarginTTM"] ? `${metrics["operatingMarginTTM"].toFixed(1)}%` : undefined },
    { label: "Net Margin", value: metrics["netProfitMarginTTM"] ? `${metrics["netProfitMarginTTM"].toFixed(1)}%` : undefined },
    { label: "FCF Margin", value: metrics["fcfMarginTTM"] ? `${metrics["fcfMarginTTM"].toFixed(1)}%` : undefined },
  ];
  const growth = [
    { label: "Rev QoQ", value: metrics["revenueGrowthQuarterlyYoy"] ? `${metrics["revenueGrowthQuarterlyYoy"].toFixed(1)}%` : undefined },
    { label: "Rev 3Y", value: metrics["revenueGrowth3Y"] ? `${metrics["revenueGrowth3Y"].toFixed(1)}%` : undefined },
    { label: "EPS TTM", value: metrics["epsGrowthTTMYoy"] ? `${metrics["epsGrowthTTMYoy"].toFixed(1)}%` : undefined },
    { label: "EPS 5Y", value: metrics["epsGrowth5Y"] ? `${metrics["epsGrowth5Y"].toFixed(1)}%` : undefined },
    { label: "EBITDA 5Y", value: metrics["ebitdaCagr5Y"] ? `${metrics["ebitdaCagr5Y"].toFixed(1)}%` : undefined },
  ];
  const balance = [
    { label: "Current Ratio", value: metrics["currentRatioQuarterly"]?.toFixed(2) },
    { label: "Debt/Equity", value: metrics["totalDebtToEquityQuarterly"]?.toFixed(2) },
    { label: "Interest Cov", value: metrics["interestCoverageQuarterly"]?.toFixed(2) },
    { label: "Book/Share", value: metrics["bookValuePerShareQuarterly"]?.toFixed(2) },
  ];
  const technicals = [
    { label: "Beta", value: metrics["beta"]?.toFixed(3) },
    { label: "50D MA", value: metrics["50DayMovingAverage"]?.toFixed(2) },
    { label: "200D MA", value: metrics["200DayMovingAverage"]?.toFixed(2) },
    { label: "52W Return", value: metrics["52WeekPriceReturnDaily"] ? `${metrics["52WeekPriceReturnDaily"].toFixed(1)}%` : undefined },
    { label: "10D Vol", value: metrics["10DayAverageTradingVolume"] ? `${(metrics["10DayAverageTradingVolume"] / 1e6).toFixed(1)}M` : undefined },
  ];
  const dividends = [
    { label: "Yield", value: metrics["dividendYieldIndicatedAnnual"] ? `${metrics["dividendYieldIndicatedAnnual"].toFixed(2)}%` : undefined },
    { label: "Div/Share", value: metrics["dividendPerShareAnnual"]?.toFixed(2) },
    { label: "Payout Ratio", value: metrics["payoutRatioAnnual"] ? `${metrics["payoutRatioAnnual"].toFixed(1)}%` : undefined },
    { label: "Div Growth 5Y", value: metrics["dividendGrowthRate5Y"] ? `${metrics["dividendGrowthRate5Y"].toFixed(1)}%` : undefined },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 h-12 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <Activity className="h-4 w-4 text-primary" />
          </button>
          <StockSearch />
          <div className="ml-auto flex items-center gap-2">
            <CurrencySelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <RiskDisclaimer />

      <main className="container mx-auto px-4 py-4 max-w-7xl">
        {/* ── Price header + Chart (always visible) ──────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div className="lg:col-span-1 bg-card border border-border rounded-lg p-4 flex flex-col justify-between">
            {isLoading ? (
              <div className="space-y-2"><Skeleton className="h-6 w-32" /><Skeleton className="h-10 w-24" /></div>
            ) : (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StockLogo symbol={upperSymbol} size={32} />
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <h1 className="text-lg font-bold text-foreground">{upperSymbol}</h1>
                        <span className="text-[10px] text-muted-foreground">{quote?.shortName || quote?.longName}</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground">{quote?.exchange} · {quote?.currency}</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mt-3">
                    <span className={`font-mono text-3xl font-bold transition-colors duration-300 ${
                      flash === "up" ? "text-stock-up" : flash === "down" ? "text-stock-down" : "text-foreground"
                    }`}>{currSym}{displayPrice?.toFixed(2) ?? "—"}</span>
                  </div>
                  {quote?.regularMarketChange != null && (
                    <span className={`font-mono text-sm font-semibold ${isPositive ? "text-stock-up" : "text-stock-down"}`}>
                      {isPositive ? "+" : ""}{convert(quote.regularMarketChange).toFixed(2)} ({isPositive ? "+" : ""}{quote.regularMarketChangePercent?.toFixed(2)}%)
                    </span>
                  )}
                  {(hasPreMarket || hasPostMarket) && (
                    <div className="flex gap-3 mt-2">
                      {hasPreMarket && (
                        <div className="flex items-center gap-1 text-[10px]">
                          <Sun className="h-2.5 w-2.5 text-amber-500" />
                          <span className="font-mono text-foreground">{currSym}{convert(quote!.preMarketPrice!).toFixed(2)}</span>
                          {quote!.preMarketChangePercent != null && (
                            <span className={quote!.preMarketChange! >= 0 ? "text-stock-up" : "text-stock-down"}>
                              {quote!.preMarketChangePercent.toFixed(2)}%
                            </span>
                          )}
                        </div>
                      )}
                      {hasPostMarket && (
                        <div className="flex items-center gap-1 text-[10px]">
                          <MoonIcon className="h-2.5 w-2.5 text-indigo-400" />
                          <span className="font-mono text-foreground">{currSym}{convert(quote!.postMarketPrice!).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* AI Score + Sentiment Summary Strip */}
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ClaudeBadge />
                    {sentimentData?.sentiment && (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        sentimentData.sentiment === "BULLISH" ? "bg-stock-up/10 text-stock-up border-stock-up/30" :
                        sentimentData.sentiment === "BEARISH" ? "bg-stock-down/10 text-stock-down border-stock-down/30" : "bg-secondary text-muted-foreground border-border"
                      }`}>{sentimentData.sentiment}</span>
                    )}
                    {sentimentData?.confidence != null && (
                      <span className="text-[9px] font-mono text-muted-foreground">{sentimentData.confidence}% conf</span>
                    )}
                    {deep?.overallRiskScore && (
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        Number(deep.overallRiskScore) <= 3 ? "bg-stock-up/10 text-stock-up" :
                        Number(deep.overallRiskScore) <= 6 ? "bg-amber-500/10 text-amber-500" : "bg-stock-down/10 text-stock-down"
                      }`}>Risk {deep.overallRiskScore}/10</span>
                    )}
                  </div>
                  {brief?.executiveSummary && (
                    <p className="text-[9px] text-foreground/70 leading-relaxed line-clamp-2">{brief.executiveSummary}</p>
                  )}
                </div>

                {profile && (
                  <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      {profile.finnhubIndustry && <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">{profile.finnhubIndustry}</span>}
                      {profile.country && <span className="text-[9px] px-1.5 py-0.5 bg-secondary text-muted-foreground rounded flex items-center gap-0.5"><MapPin className="h-2 w-2" />{profile.country}</span>}
                    </div>
                    {profile.marketCapitalization && <p className="text-[10px] text-muted-foreground">Mkt Cap: <span className="font-mono text-foreground">${(profile.marketCapitalization / 1000).toFixed(1)}B</span></p>}
                    {profile.weburl && <a href={profile.weburl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:underline flex items-center gap-0.5"><Globe className="h-2 w-2" />Website</a>}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="lg:col-span-2 bg-card border border-border rounded-lg p-4">
            <StockChart symbol={upperSymbol} />
          </div>
        </div>

        {/* ── Tab Bar ───────────────────────────────────── */}
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1 mb-4 overflow-x-auto">
          <TabBtn active={tab === "overview"} label="Overview" icon={Activity} onClick={() => setTab("overview")} />
          <TabBtn active={tab === "fundamentals"} label="Fundamentals" icon={BarChart3} onClick={() => setTab("fundamentals")} />
          <TabBtn active={tab === "deep"} label="Deep Analysis" icon={Crosshair} onClick={() => setTab("deep")} />
          <TabBtn active={tab === "polymarket"} label="Polymarket" onClick={() => setTab("polymarket")} customIcon={<PolymarketLogo size={14} />} />
          <TabBtn active={tab === "sec"} label="SEC Filings" icon={Building2} onClick={() => setTab("sec")} />
          <TabBtn active={tab === "news"} label="News" icon={Newspaper} onClick={() => setTab("news")} />
        </div>

        {/* ═══════ OVERVIEW TAB ═══════ */}
        {tab === "overview" && (
          <div className="space-y-4">
            {/* AI Summary + Scores on top */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Section icon={Sparkles} title="AI Investment Brief" loading={analysisLoading} className="lg:col-span-2" badge={<ClaudeBadge />}>
                {brief ? (
                  <div className="space-y-3">
                    <p className="text-xs text-foreground leading-relaxed border-l-2 pl-3" style={{ borderColor: CLAUDE_ORANGE }}>{brief.executiveSummary}</p>
                    {brief.trendOverview && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                          brief.trendOverview.direction === "UP" ? "bg-stock-up/10 text-stock-up" :
                          brief.trendOverview.direction === "DOWN" ? "bg-stock-down/10 text-stock-down" : "bg-secondary text-muted-foreground"
                        }`}>{brief.trendOverview.direction} · {brief.trendOverview.strength}</span>
                        <span className="text-[10px] text-muted-foreground">{brief.trendOverview.description}</span>
                      </div>
                    )}
                    {brief.drivers?.length > 0 && (
                      <div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Key Drivers</p>
                        <ul className="space-y-0.5">{brief.drivers.map((d: string, i: number) => <li key={i} className="text-[11px] text-foreground flex items-start gap-1"><span style={{ color: CLAUDE_ORANGE }} className="mt-0.5">▸</span>{d}</li>)}</ul>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {brief.opportunities?.length > 0 && <div><p className="text-[9px] text-stock-up uppercase tracking-wider mb-1">Opportunities</p><ul className="space-y-0.5">{brief.opportunities.map((o: string, i: number) => <li key={i} className="text-[10px] text-foreground/80">+ {o}</li>)}</ul></div>}
                      {brief.risks?.length > 0 && <div><p className="text-[9px] text-stock-down uppercase tracking-wider mb-1">Risks</p><ul className="space-y-0.5">{brief.risks.map((r: string, i: number) => <li key={i} className="text-[10px] text-foreground/80">− {r}</li>)}</ul></div>}
                    </div>
                    {brief.whatToWatch?.length > 0 && <div><p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Watch</p><div className="flex flex-wrap gap-1">{brief.whatToWatch.map((w: string, i: number) => <span key={i} className="text-[9px] px-1.5 py-0.5 bg-secondary rounded text-foreground/80">{w}</span>)}</div></div>}
                  </div>
                ) : analysisLoading ? (
                  <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" style={{ color: CLAUDE_ORANGE }} /><span className="text-xs text-muted-foreground">Claude is generating brief…</span></div>
                ) : <p className="text-[10px] text-muted-foreground">No analysis available</p>}
              </Section>

              <div className="space-y-4">
                <Section icon={Shield} title="Risk Score" loading={deepLoading} badge={<ClaudeBadge />}>
                  {deep?.overallRiskScore ? (
                    <div className="flex flex-col items-center justify-center py-2">
                      <div className={`text-4xl font-mono font-bold mb-1 ${Number(deep.overallRiskScore) <= 3 ? "text-stock-up" : Number(deep.overallRiskScore) <= 6 ? "text-amber-500" : "text-stock-down"}`}>{deep.overallRiskScore}/10</div>
                      {deep.executiveBrief && <p className="text-[9px] text-foreground/70 text-center leading-relaxed">{deep.executiveBrief}</p>}
                    </div>
                  ) : <p className="text-[10px] text-muted-foreground text-center py-4">Loading…</p>}
                </Section>

                <Section icon={Sparkles} title="AI Sentiment" loading={sentimentLoading || newsLoading} badge={<ClaudeBadge />}>
                  {sentimentData ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${
                          sentimentData.sentiment === "BULLISH" ? "bg-stock-up/10 text-stock-up border-stock-up/30" :
                          sentimentData.sentiment === "BEARISH" ? "bg-stock-down/10 text-stock-down border-stock-down/30" : "bg-secondary text-muted-foreground border-border"
                        }`}>{sentimentData.sentiment}</span>
                        {sentimentData.confidence != null && <span className="text-[10px] font-mono text-foreground">{sentimentData.confidence}%</span>}
                        {sentimentData.risk && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${riskColor(sentimentData.risk)}`}>{sentimentData.risk} RISK</span>}
                      </div>
                      {sentimentData.summary && <p className="text-[10px] text-foreground/80 leading-relaxed">{sentimentData.summary}</p>}
                    </div>
                  ) : <p className="text-[10px] text-muted-foreground">Loading…</p>}
                </Section>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Section icon={Activity} title="Market Data" loading={isLoading}>
                <div className="grid grid-cols-2 gap-2">{marketData.map(d => <Metric key={d.label} {...d} />)}</div>
              </Section>
              <Section icon={BarChart3} title="Valuation" loading={profileLoading}>
                <div className="grid grid-cols-2 gap-2">{valuation.map(d => <Metric key={d.label} {...d} />)}</div>
              </Section>
              <Section icon={DollarSign} title="Profitability" loading={profileLoading}>
                <div className="grid grid-cols-2 gap-2">{profitability.map(d => <Metric key={d.label} {...d} />)}</div>
              </Section>
              <Section icon={Shield} title="Balance Sheet" loading={profileLoading}>
                <div className="grid grid-cols-2 gap-2">{balance.map(d => <Metric key={d.label} {...d} />)}</div>
              </Section>
            </div>

            {peers.length > 0 && (
              <Section icon={Building2} title="Peer Companies" loading={profileLoading}>
                <div className="flex flex-wrap gap-1.5">
                  {[...new Set(peers.filter((p: string) => p !== upperSymbol))].slice(0, 20).map((peer: string) => (
                    <a key={peer} href={`/stock/${peer}`} className="px-2 py-1 bg-secondary rounded text-[10px] font-mono font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-colors">{peer}</a>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {/* ═══════ FUNDAMENTALS TAB ═══════ */}
        {tab === "fundamentals" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Section icon={TrendingUp} title="Growth" loading={profileLoading}><div className="grid grid-cols-2 gap-2">{growth.map(d => <Metric key={d.label} {...d} />)}</div></Section>
              <Section icon={Activity} title="Technicals" loading={profileLoading}><div className="grid grid-cols-2 gap-2">{technicals.map(d => <Metric key={d.label} {...d} />)}</div></Section>
              <Section icon={Briefcase} title="Dividends" loading={profileLoading}><div className="grid grid-cols-2 gap-2">{dividends.map(d => <Metric key={d.label} {...d} />)}</div></Section>
              <Section icon={Users} title="Analyst Consensus" loading={profileLoading}>
                {latestRec ? (
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { l: "SB", v: latestRec.strongBuy, c: "bg-emerald-500" },
                      { l: "B", v: latestRec.buy, c: "bg-green-400" },
                      { l: "H", v: latestRec.hold, c: "bg-yellow-400" },
                      { l: "S", v: latestRec.sell, c: "bg-orange-400" },
                      { l: "SS", v: latestRec.strongSell, c: "bg-red-500" },
                    ].map(item => (
                      <div key={item.l} className="text-center">
                        <div className={`${item.c} text-white rounded py-1 mb-0.5`}><span className="font-mono text-xs font-bold">{item.v || 0}</span></div>
                        <span className="text-[8px] text-muted-foreground">{item.l}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-[10px] text-muted-foreground">No data</p>}
              </Section>
            </div>

            <Section icon={BarChart3} title="Earnings History" loading={earningsLoading}>
              {pastEarnings.length > 0 ? (
                <div className="space-y-1">
                  <div className="grid grid-cols-4 gap-2 text-[9px] text-muted-foreground font-medium px-2 mb-1">
                    <span>Date</span><span className="text-right">Actual</span><span className="text-right">Est.</span><span className="text-right">Surprise</span>
                  </div>
                  {pastEarnings.map((e: any, i: number) => {
                    const beat = e.epsActual != null && e.epsEstimate != null ? e.epsActual >= e.epsEstimate : null;
                    const surprise = e.epsActual != null && e.epsEstimate != null && e.epsEstimate !== 0 ? ((e.epsActual - e.epsEstimate) / Math.abs(e.epsEstimate)) * 100 : null;
                    return (
                      <div key={i} className="grid grid-cols-4 items-center gap-2 px-2 py-1.5 rounded bg-secondary/30 text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          {beat != null && (beat ? <ArrowUpRight className="h-3 w-3 text-stock-up" /> : <ArrowDownRight className="h-3 w-3 text-stock-down" />)}
                          {new Date(e.date * 1000).toLocaleDateString(undefined, { month: "short", year: "2-digit" })}
                        </span>
                        <span className="font-mono text-foreground text-right">{currSym}{e.epsActual?.toFixed(2) ?? "—"}</span>
                        <span className="font-mono text-muted-foreground text-right">{e.epsEstimate != null ? `${currSym}${e.epsEstimate.toFixed(2)}` : "—"}</span>
                        <span className={`font-mono text-right ${beat ? "text-stock-up" : "text-stock-down"}`}>{surprise != null ? `${surprise > 0 ? "+" : ""}${surprise.toFixed(1)}%` : "—"}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-[10px] text-muted-foreground">No earnings data available</p>}
            </Section>
          </div>
        )}

        {/* ═══════ DEEP ANALYSIS TAB ═══════ */}
        {tab === "deep" && (
          <div className="space-y-4">
            {/* Executive brief on top */}
            {deep && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Section icon={Shield} title="Risk Assessment" loading={deepLoading} className="lg:col-span-1" badge={<ClaudeBadge />}>
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className={`text-4xl font-mono font-bold mb-1 ${Number(deep.overallRiskScore) <= 3 ? "text-stock-up" : Number(deep.overallRiskScore) <= 6 ? "text-amber-500" : "text-stock-down"}`}>{deep.overallRiskScore}/10</div>
                    <p className="text-[10px] text-muted-foreground text-center">Overall Risk Score</p>
                    {deep.executiveBrief && <p className="text-[10px] text-foreground/70 text-center mt-3 leading-relaxed">{deep.executiveBrief}</p>}
                  </div>
                </Section>
                <Section icon={Zap} title="Upcoming Catalysts" loading={deepLoading} className="lg:col-span-2" badge={<ClaudeBadge />}>
                  {deep.catalysts?.length ? (
                    <div className="space-y-1">{deep.catalysts.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                        <Calendar className="h-3 w-3 shrink-0" style={{ color: CLAUDE_ORANGE }} />
                        <span className="text-[10px] text-foreground flex-1">{c.event}</span>
                        <SourceLink url={c.sourceUrl} />
                        <span className="text-[9px] text-muted-foreground">{c.date}</span>
                        <span className={`text-[9px] font-bold ${dirColor(c.direction)}`}>{c.direction}</span>
                        <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${riskColor(c.impact)}`}>{c.impact}</span>
                      </div>
                    ))}</div>
                  ) : <p className="text-[10px] text-muted-foreground">No catalysts</p>}
                </Section>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Section icon={Link2} title="Supply Chain Map" loading={deepLoading} badge={<ClaudeBadge />}>
                {deep?.supplyChain ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">Upstream (Suppliers)</p>
                      <div className="space-y-1.5">
                        {deep.supplyChain.upstream.map((u, i) => (
                          <div key={i} className="bg-secondary/40 rounded p-2">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <Factory className="h-2.5 w-2.5 text-primary" />
                              <span className="text-[10px] font-semibold text-foreground">{u.category}</span>
                              <span className={`text-[8px] font-bold px-1 py-0.5 rounded ml-auto ${riskColor(u.risk)}`}>{u.risk}</span>
                            </div>
                            <p className="text-[9px] text-muted-foreground">{u.keyPlayers.join(", ")}</p>
                            <p className="text-[9px] text-foreground/70 mt-0.5">{u.notes}</p>
                            <SourceLink url={u.sourceUrl} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">Downstream (Distribution)</p>
                      <div className="space-y-1.5">
                        {deep.supplyChain.downstream.map((d, i) => (
                          <div key={i} className="bg-secondary/40 rounded p-2">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <Truck className="h-2.5 w-2.5 text-primary" />
                              <span className="text-[10px] font-semibold text-foreground">{d.category}</span>
                              <span className={`text-[8px] font-bold px-1 py-0.5 rounded ml-auto ${riskColor(d.risk)}`}>{d.risk}</span>
                            </div>
                            <p className="text-[9px] text-muted-foreground">{d.keyPlayers.join(", ")}</p>
                            <SourceLink url={d.sourceUrl} />
                          </div>
                        ))}
                      </div>
                    </div>
                    {deep.supplyChain.singlePointsOfFailure?.length > 0 && (
                      <div>
                        <p className="text-[9px] text-stock-down uppercase tracking-wider mb-1">⚠ Single Points of Failure</p>
                        {deep.supplyChain.singlePointsOfFailure.map((s, i) => <p key={i} className="text-[10px] text-foreground/80">• {s}</p>)}
                      </div>
                    )}
                  </div>
                ) : deepLoading ? <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" style={{ color: CLAUDE_ORANGE }} /><span className="text-xs text-muted-foreground">Claude is mapping supply chain…</span></div> : <p className="text-[10px] text-muted-foreground">No data</p>}
              </Section>

              <Section icon={Crosshair} title="Competitive Landscape" loading={deepLoading} badge={<ClaudeBadge />}>
                {deep?.horizontalCompetition ? (
                  <div className="space-y-3">
                    <p className="text-xs text-foreground/80">{deep.horizontalCompetition.marketPosition}</p>
                    {deep.horizontalCompetition.moats?.length > 0 && (
                      <div><p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Moats</p><div className="flex flex-wrap gap-1">{deep.horizontalCompetition.moats.map((m, i) => <span key={i} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${CLAUDE_ORANGE}15`, color: CLAUDE_ORANGE }}>{m}</span>)}</div></div>
                    )}
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">Direct Competitors</p>
                      <div className="space-y-1">
                        {deep.horizontalCompetition.directCompetitors.map((c, i) => (
                          <div key={i} className="flex items-center gap-2 bg-secondary/40 rounded px-2 py-1.5">
                            <a href={`/stock/${c.symbol}`} className="font-mono text-[10px] font-bold text-primary hover:underline">{c.symbol}</a>
                            <span className="text-[10px] text-foreground flex-1 min-w-0 truncate">{c.name}</span>
                            <SourceLink url={c.sourceUrl} />
                            <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${riskColor(c.threatLevel)}`}>{c.threatLevel}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {deep.verticalIntegration && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div><p className="text-[9px] text-muted-foreground uppercase mb-1">Owned</p>{deep.verticalIntegration.owned.map((o, i) => <p key={i} className="text-[9px] text-foreground/80">✓ {o}</p>)}</div>
                        <div><p className="text-[9px] text-muted-foreground uppercase mb-1">Outsourced</p>{deep.verticalIntegration.outsourced.map((o, i) => <p key={i} className="text-[9px] text-foreground/80">○ {o}</p>)}</div>
                      </div>
                    )}
                  </div>
                ) : deepLoading ? <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" style={{ color: CLAUDE_ORANGE }} /><span className="text-xs text-muted-foreground">Analyzing…</span></div> : <p className="text-[10px] text-muted-foreground">No data</p>}
              </Section>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Section icon={Cloud} title="Weather & Climate" loading={deepLoading}>
                {deep?.weatherClimateRisks?.length ? (
                  <div className="space-y-1.5">{deep.weatherClimateRisks.map((w, i) => (
                    <div key={i} className="bg-secondary/40 rounded p-2">
                      <div className="flex items-center gap-1 mb-0.5"><span className="text-[10px] font-semibold text-foreground">{w.event}</span><span className={`text-[8px] font-bold px-1 py-0.5 rounded ml-auto ${riskColor(w.probability)}`}>{w.probability}</span></div>
                      <p className="text-[9px] text-foreground/70">{w.impact}</p>
                      <SourceLink url={w.sourceUrl} />
                    </div>
                  ))}</div>
                ) : <p className="text-[10px] text-muted-foreground">No weather risks</p>}
              </Section>
              <Section icon={Globe} title="Geopolitical" loading={deepLoading}>
                {deep?.geopoliticalRisks?.length ? (
                  <div className="space-y-1.5">{deep.geopoliticalRisks.map((g, i) => (
                    <div key={i} className="bg-secondary/40 rounded p-2">
                      <div className="flex items-center gap-1 mb-0.5"><span className="text-[10px] font-semibold text-foreground">{g.risk}</span><span className={`text-[8px] font-bold px-1 py-0.5 rounded ml-auto ${riskColor(g.severity)}`}>{g.severity}</span></div>
                      <p className="text-[9px] text-foreground/70">{g.exposure}</p>
                      <SourceLink url={g.sourceUrl} />
                    </div>
                  ))}</div>
                ) : <p className="text-[10px] text-muted-foreground">No geopolitical risks</p>}
              </Section>
              <Section icon={Activity} title="Macro Sensitivity" loading={deepLoading}>
                {deep?.macroSensitivity?.length ? (
                  <div className="space-y-1.5">{deep.macroSensitivity.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 py-1 border-b border-border/50 last:border-0">
                      <span className="text-[10px] text-foreground flex-1">{m.factor}</span>
                      <span className={`text-[9px] font-bold ${dirColor(m.direction)}`}>{m.direction}</span>
                      <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${riskColor(m.sensitivity)}`}>{m.sensitivity}</span>
                    </div>
                  ))}</div>
                ) : <p className="text-[10px] text-muted-foreground">No macro data</p>}
              </Section>
            </div>
          </div>
        )}

        {/* ═══════ POLYMARKET TAB ═══════ */}
        {tab === "polymarket" && (
          <div className="space-y-4">
            {/* AI Summary on top */}
            <Section icon={Sparkles} title={`AI Analysis: How Prediction Markets Impact ${upperSymbol}`} loading={polySummaryLoading} badge={<ClaudeBadge />}>
              {polySummary ? (
                <div className="space-y-3">
                  <p className="text-xs text-foreground leading-relaxed border-l-2 pl-3" style={{ borderColor: CLAUDE_ORANGE }}>{polySummary.summary}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {polySummary.bullishFactors?.length > 0 && (
                      <div className="bg-stock-up/5 rounded-lg p-3 border border-stock-up/20">
                        <p className="text-[9px] text-stock-up uppercase tracking-wider mb-2 font-bold">▲ Bullish Signals</p>
                        <ul className="space-y-1.5">{polySummary.bullishFactors.map((f: string, i: number) => <li key={i} className="text-[10px] text-foreground/80 leading-relaxed">{f}</li>)}</ul>
                      </div>
                    )}
                    {polySummary.bearishFactors?.length > 0 && (
                      <div className="bg-stock-down/5 rounded-lg p-3 border border-stock-down/20">
                        <p className="text-[9px] text-stock-down uppercase tracking-wider mb-2 font-bold">▼ Bearish Signals</p>
                        <ul className="space-y-1.5">{polySummary.bearishFactors.map((f: string, i: number) => <li key={i} className="text-[10px] text-foreground/80 leading-relaxed">{f}</li>)}</ul>
                      </div>
                    )}
                  </div>
                  {polySummary.overallImpact && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <span className="text-[9px] text-muted-foreground uppercase">Overall Impact:</span>
                      <span className={`text-sm font-bold ${dirColor(polySummary.overallImpact)}`}>{polySummary.overallImpact}</span>
                    </div>
                  )}
                </div>
              ) : polySummaryLoading ? (
                <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" style={{ color: CLAUDE_ORANGE }} /><span className="text-xs text-muted-foreground">Claude is analyzing prediction market impact…</span></div>
              ) : <p className="text-[10px] text-muted-foreground">No prediction markets found for this stock</p>}
            </Section>

            {/* Probability visualization */}
            {polyMarkets.length > 0 && (
              <Section icon={BarChart3} title="Market Probabilities" badge={<span className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded-full bg-[#0052FF]/10 text-[#0052FF] border border-[#0052FF]/30"><PolymarketLogo size={10} />Live</span>}>
                <div className="space-y-3">
                  {polyMarkets.map((m, i) => {
                    const prices = parsePolyPrices(m.outcomePrices);
                    const yesPct = prices[0] != null ? prices[0] * 100 : 0;
                    const noPct = prices[1] != null ? prices[1] * 100 : 100 - yesPct;
                    const volume = toFiniteNumber(m.volume);
                    return (
                      <a key={m.id || i} href={m.url} target="_blank" rel="noopener noreferrer" className="block hover:bg-secondary/30 rounded-lg p-2 transition-colors">
                        <p className="text-[11px] font-semibold text-foreground mb-2">{m.question}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-6 rounded-full overflow-hidden flex bg-secondary">
                            <div className="h-full flex items-center justify-center text-[9px] font-bold text-white transition-all" style={{ width: `${Math.max(yesPct, 5)}%`, background: "hsl(var(--stock-up))" }}>
                              {yesPct >= 15 && `YES ${yesPct.toFixed(0)}%`}
                            </div>
                            <div className="h-full flex items-center justify-center text-[9px] font-bold text-white transition-all" style={{ width: `${Math.max(noPct, 5)}%`, background: "hsl(var(--stock-down))" }}>
                              {noPct >= 15 && `NO ${noPct.toFixed(0)}%`}
                            </div>
                          </div>
                          {volume > 0 && <span className="text-[8px] text-muted-foreground whitespace-nowrap">{volume > 1e6 ? `$${(volume / 1e6).toFixed(1)}M` : volume > 1e3 ? `$${(volume / 1e3).toFixed(0)}K` : `$${volume.toFixed(0)}`}</span>}
                        </div>
                      </a>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Search queries used */}
            {polyData?.queries?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[9px] text-muted-foreground">AI search queries:</span>
                {polyData.queries.map((q: string, i: number) => (
                  <span key={i} className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{q}</span>
                ))}
              </div>
            )}

            <Section icon={Target} title="Market Details" loading={polyLoading} badge={<span className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded-full bg-[#0052FF]/10 text-[#0052FF] border border-[#0052FF]/30"><PolymarketLogo size={10} />Live Data</span>}>
              {polyMarkets.length > 0 ? (
                <div className="space-y-2">
                  {polyMarkets.map((m, i) => {
                    const prices = parsePolyPrices(m.outcomePrices);
                    const yesPrice = prices[0] != null ? (prices[0] * 100).toFixed(0) : null;
                    const noPrice = prices[1] != null ? (prices[1] * 100).toFixed(0) : null;
                    const volume = toFiniteNumber(m.volume);
                    return (
                      <a key={m.id || i} href={m.url} target="_blank" rel="noopener noreferrer" className="block bg-secondary/40 rounded p-3 hover:bg-secondary/60 transition-colors border border-transparent hover:border-[#0052FF]/20">
                        <p className="text-[11px] font-semibold text-foreground mb-1">{m.question}</p>
                        <div className="flex items-center gap-3 mb-1">
                          {yesPrice && <div className="flex items-center gap-1"><span className="text-[9px] text-muted-foreground">YES</span><span className="font-mono text-xs font-bold text-stock-up">{yesPrice}¢</span></div>}
                          {noPrice && <div className="flex items-center gap-1"><span className="text-[9px] text-muted-foreground">NO</span><span className="font-mono text-xs font-bold text-stock-down">{noPrice}¢</span></div>}
                          {volume > 0 && <span className="text-[8px] text-muted-foreground ml-auto">Vol: {volume > 1e6 ? `$${(volume / 1e6).toFixed(1)}M` : volume > 1e3 ? `$${(volume / 1e3).toFixed(0)}K` : `$${volume.toFixed(0)}`}</span>}
                        </div>
                        {m.description && <p className="text-[9px] text-foreground/60 line-clamp-2">{m.description}</p>}
                        <div className="flex items-center gap-1 mt-1">
                          <PolymarketLogo size={10} /><span className="text-[8px] text-[#0052FF]">View on Polymarket</span>
                          {m.endDate && <span className="text-[8px] text-muted-foreground ml-auto">Ends: {new Date(m.endDate).toLocaleDateString()}</span>}
                        </div>
                      </a>
                    );
                  })}
                  <a href={polySearchUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 text-[10px] text-[#0052FF] hover:underline pt-1">
                    <PolymarketLogo size={12} />Browse all markets on Polymarket
                  </a>
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-[10px] text-muted-foreground mb-1">No active prediction markets found for {upperSymbol}</p>
                  <a href={polySearchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-[#0052FF] hover:underline"><PolymarketLogo size={12} />Search Polymarket</a>
                </div>
              )}
            </Section>

            {deep?.predictionMarketSignals?.length ? (
              <Section icon={Sparkles} title="AI-Generated Prediction Signals" loading={deepLoading} badge={<ClaudeBadge />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {deep.predictionMarketSignals.map((p, i) => (
                    <div key={i} className="bg-secondary/40 rounded p-3 border-l-2" style={{ borderColor: CLAUDE_ORANGE }}>
                      <div className="flex items-center gap-1 mb-1"><span className="text-[11px] font-semibold text-foreground flex-1">{p.outcome}</span><span className="font-mono text-sm font-bold text-primary">{p.impliedProbability}</span></div>
                      <p className="text-[10px] text-foreground/70 mb-1">{p.reasoning}</p>
                      <div className="flex items-center justify-between"><p className="text-[9px] text-muted-foreground">{p.timeframe}</p><SourceLink url={p.sourceUrl} label="Source" /></div>
                    </div>
                  ))}
                </div>
              </Section>
            ) : null}
          </div>
        )}

        {/* ═══════ NEWS TAB ═══════ */}
        {tab === "news" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section icon={Zap} title="Relevant Macro News" loading={relevantLoading}>
              {relevantQueries.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">{relevantQueries.map((q: string, i: number) => <span key={i} className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{q}</span>)}</div>
              )}
              {relevantArticles.length > 0 ? (
                <div className="space-y-1.5">{relevantArticles.slice(0, 8).map((a: any, i: number) => (
                  <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="block p-2 rounded bg-secondary/30 hover:bg-secondary/60 transition-colors">
                    <p className="text-[11px] font-medium text-foreground line-clamp-2">{a.title}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{a.source?.name} · {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : ""}</p>
                  </a>
                ))}</div>
              ) : <p className="text-[10px] text-muted-foreground">No relevant macro news</p>}
            </Section>
            <Section icon={Newspaper} title={`Latest News (${articles.length})`} loading={newsLoading}>
              {articles.length > 0 ? (
                <div className="space-y-1.5">{articles.slice(0, 8).map((a: any, i: number) => (
                  <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="block p-2 rounded bg-secondary/30 hover:bg-secondary/60 transition-colors">
                    <div className="flex gap-2">
                      {a.urlToImage && <img src={a.urlToImage} alt="" className="w-10 h-10 rounded object-cover shrink-0" onError={(e) => (e.currentTarget.style.display = "none")} />}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-foreground line-clamp-2">{a.title}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{a.source?.name} · {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : ""}</p>
                      </div>
                    </div>
                  </a>
                ))}</div>
              ) : <p className="text-[10px] text-muted-foreground">No news found</p>}
            </Section>
          </div>
        )}

        {/* ═══════ SEC FILINGS TAB ═══════ */}
        {tab === "sec" && (
          <div className="space-y-4">
            <Section icon={Building2} title={`SEC Filings — ${upperSymbol}`} loading={secLoading} badge={<ClaudeBadge label="AI Summaries" />}>
              {secData?.filings?.length ? (
                <div className="space-y-3">
                  {secData.filings.map((f: any, i: number) => (
                    <a
                      key={i}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-secondary/40 rounded-lg p-4 hover:bg-secondary/60 transition-colors border border-transparent hover:border-primary/20"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-mono font-bold text-primary px-2 py-1 bg-primary/10 rounded">
                          {f.form}
                        </span>
                        <span className="text-[11px] font-semibold text-foreground flex-1">
                          {f.description}
                        </span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {f.filingDate}
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                      </div>
                      <p className="text-[10px] text-foreground/70 leading-relaxed border-l-2 pl-3" style={{ borderColor: CLAUDE_ORANGE }}>
                        {f.summary}
                      </p>
                    </a>
                  ))}
                </div>
              ) : secLoading ? (
                <div className="flex items-center gap-2 py-8 justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: CLAUDE_ORANGE }} />
                  <span className="text-xs text-muted-foreground">Fetching SEC filings from EDGAR…</span>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground text-center py-6">
                  No SEC filings found for {upperSymbol}
                </p>
              )}
            </Section>
          </div>
        )}
      </main>
    </div>
  );
};

export default StockDetail;
