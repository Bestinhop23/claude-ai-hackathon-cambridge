import { lazy, Suspense, useState } from "react";
import { Activity, Globe, BarChart3, Loader2, Target, TrendingUp, TrendingDown, ExternalLink, Sparkles, Briefcase, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import ThemeToggle from "@/components/ThemeToggle";
import CurrencySelector from "@/components/CurrencySelector";
import StockSearch from "@/components/StockSearch";
import MarketOverview from "@/components/MarketOverview";
import StockLogo from "@/components/StockLogo";
import { useMarketInsights, useMultiQuote, type YahooQuote } from "@/hooks/useStockData";
import { useCurrency } from "@/contexts/CurrencyContext";

const GlobeView = lazy(() => import("@/components/GlobeView"));

const CLAUDE_ORANGE = "#D97757";
const ClaudeBadge = () => (
  <span className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: `${CLAUDE_ORANGE}15`, color: CLAUDE_ORANGE, border: `1px solid ${CLAUDE_ORANGE}30` }}>
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill={CLAUDE_ORANGE}/><path d="M16.5 8.5L12 16L7.5 8.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    Claude AI
  </span>
);

const PolymarketLogo = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#0052FF"/>
    <text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white">P</text>
  </svg>
);

function parsePolyPrices(raw: any): number[] {
  if (!raw) return [];
  let arr = raw;
  if (typeof raw === "string") { try { arr = JSON.parse(raw); } catch { return []; } }
  if (!Array.isArray(arr)) return [];
  return arr.map((v: any) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; });
}

const InsightsTab = () => {
  const { data, isLoading } = useMarketInsights();
  const winners = data?.winners || [];
  const losers = data?.losers || [];
  const markets = data?.markets || [];
  const summary = data?.summary || "";

  // Prepare chart data for market probabilities
  const marketChartData = markets.slice(0, 8).map((m: any) => {
    const prices = parsePolyPrices(m.outcomePrices);
    const yesPct = prices[0] ? prices[0] * 100 : 0;
    return {
      name: (m.question || "").length > 40 ? (m.question || "").slice(0, 37) + "…" : m.question,
      probability: Math.round(yesPct),
      volume: (m.volume || 0) / 1000,
    };
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 gap-3">
      <Loader2 className="h-6 w-6 animate-spin" style={{ color: CLAUDE_ORANGE }} />
      <span className="text-sm text-muted-foreground">Claude is analyzing prediction markets for stock signals…</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {summary && (
        <div className="bg-card border border-border rounded-lg p-4 flex items-start gap-3" style={{ borderLeftWidth: 3, borderLeftColor: CLAUDE_ORANGE }}>
          <Sparkles className="h-5 w-5 shrink-0 mt-0.5" style={{ color: CLAUDE_ORANGE }} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-bold text-foreground">Prediction Market Intelligence</h3>
              <ClaudeBadge />
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed">{summary}</p>
          </div>
        </div>
      )}

      {/* Probability bar chart */}
      {marketChartData.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <PolymarketLogo size={16} />
            <h3 className="text-sm font-bold text-foreground">Live Market Probabilities</h3>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#0052FF]/10 text-[#0052FF] border border-[#0052FF]/30">Live Data</span>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(200, marketChartData.length * 40)}>
            <BarChart data={marketChartData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 9 }} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Probability"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="probability" radius={[0, 4, 4, 0]}>
                {marketChartData.map((entry, index) => (
                  <Cell key={index} fill={entry.probability > 60 ? "hsl(var(--stock-up))" : entry.probability > 40 ? "hsl(var(--primary))" : "hsl(var(--stock-down))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Winners */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-stock-up/5">
            <TrendingUp className="h-4 w-4 text-stock-up" />
            <h3 className="text-sm font-bold text-foreground">Potential Winners</h3>
            <ClaudeBadge />
          </div>
          <div className="divide-y divide-border">
            {winners.map((w, i) => (
              <a key={i} href={`/stock/${w.symbol}`} className="block px-4 py-3 hover:bg-secondary/40 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <StockLogo symbol={w.symbol} size={20} />
                  <span className="font-mono text-sm font-bold text-stock-up">{w.symbol}</span>
                  <span className="text-xs text-foreground">{w.name}</span>
                  {w.impliedProbability && <span className="text-[9px] font-mono text-primary ml-auto">{w.impliedProbability}</span>}
                </div>
                <p className="text-[11px] text-foreground/70 mb-1">{w.thesis}</p>
                {w.relevantMarket && <p className="text-[9px] text-muted-foreground mt-0.5 flex items-center gap-1"><Target className="h-2.5 w-2.5" />{w.relevantMarket}</p>}
              </a>
            ))}
            {winners.length === 0 && <p className="text-xs text-muted-foreground p-4">No signals</p>}
          </div>
        </div>

        {/* Losers */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-stock-down/5">
            <TrendingDown className="h-4 w-4 text-stock-down" />
            <h3 className="text-sm font-bold text-foreground">Potential Losers</h3>
            <ClaudeBadge />
          </div>
          <div className="divide-y divide-border">
            {losers.map((l, i) => (
              <a key={i} href={`/stock/${l.symbol}`} className="block px-4 py-3 hover:bg-secondary/40 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <StockLogo symbol={l.symbol} size={20} />
                  <span className="font-mono text-sm font-bold text-stock-down">{l.symbol}</span>
                  <span className="text-xs text-foreground">{l.name}</span>
                  {l.impliedProbability && <span className="text-[9px] font-mono text-primary ml-auto">{l.impliedProbability}</span>}
                </div>
                <p className="text-[11px] text-foreground/70 mb-1">{l.thesis}</p>
                {l.relevantMarket && <p className="text-[9px] text-muted-foreground mt-0.5 flex items-center gap-1"><Target className="h-2.5 w-2.5" />{l.relevantMarket}</p>}
              </a>
            ))}
            {losers.length === 0 && <p className="text-xs text-muted-foreground p-4">No signals</p>}
          </div>
        </div>
      </div>

      {/* Live Polymarket feeds */}
      {markets.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/30">
            <PolymarketLogo size={16} />
            <h3 className="text-sm font-bold text-foreground">Live Prediction Markets</h3>
            <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer" className="ml-auto text-[9px] text-[#0052FF] hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" />Polymarket</a>
          </div>
          <div className="divide-y divide-border">
            {markets.map((m: any, i: number) => {
              const prices = parsePolyPrices(m.outcomePrices);
              const yesPct = prices[0] != null ? prices[0] * 100 : 0;
              const noPct = prices[1] != null ? prices[1] * 100 : 100 - yesPct;
              return (
                <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" className="block px-4 py-3 hover:bg-secondary/40 transition-colors">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-[11px] text-foreground flex-1 font-medium">{m.question}</span>
                    {m.volume > 0 && <span className="text-[9px] text-muted-foreground">${m.volume > 1e6 ? `${(m.volume / 1e6).toFixed(1)}M` : `${(m.volume / 1e3).toFixed(0)}K`}</span>}
                    <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-4 rounded-full overflow-hidden flex bg-secondary">
                      <div className="h-full flex items-center justify-center text-[8px] font-bold text-white" style={{ width: `${Math.max(yesPct, 8)}%`, background: "hsl(var(--stock-up))" }}>
                        {yesPct >= 12 && `${yesPct.toFixed(0)}%`}
                      </div>
                      <div className="h-full flex items-center justify-center text-[8px] font-bold text-white" style={{ width: `${Math.max(noPct, 8)}%`, background: "hsl(var(--stock-down))" }}>
                        {noPct >= 12 && `${noPct.toFixed(0)}%`}
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
/* ── Portfolio Tab ─────────────────────────────────────── */
const PORTFOLIO_HOLDINGS = [
  { symbol: "AAPL", shares: 30, avgCost: 178.50, allocation: 12 },
  { symbol: "MSFT", shares: 18, avgCost: 380.20, allocation: 11 },
  { symbol: "NVDA", shares: 12, avgCost: 720.00, allocation: 10 },
  { symbol: "GOOGL", shares: 35, avgCost: 155.80, allocation: 8 },
  { symbol: "AMZN", shares: 25, avgCost: 185.60, allocation: 7 },
  { symbol: "JPM", shares: 20, avgCost: 195.40, allocation: 6 },
  { symbol: "UNH", shares: 8, avgCost: 520.30, allocation: 6 },
  { symbol: "V", shares: 18, avgCost: 280.10, allocation: 5 },
  { symbol: "JNJ", shares: 25, avgCost: 158.90, allocation: 5 },
  { symbol: "XOM", shares: 30, avgCost: 108.70, allocation: 5 },
  { symbol: "PG", shares: 22, avgCost: 165.30, allocation: 5 },
  { symbol: "LLY", shares: 6, avgCost: 780.00, allocation: 5 },
  { symbol: "BRK-B", shares: 12, avgCost: 365.50, allocation: 5 },
  { symbol: "HD", shares: 8, avgCost: 355.20, allocation: 5 },
  { symbol: "COST", shares: 5, avgCost: 720.60, allocation: 5 },
];

const PortfolioTab = () => {
  const symbols = PORTFOLIO_HOLDINGS.map(h => h.symbol);
  const { data: quotes, isLoading } = useMultiQuote(symbols);
  const { convert, symbol: currSym } = useCurrency();

  const quotesMap: Record<string, YahooQuote> = {};
  (quotes || []).forEach(q => { if (q.symbol) quotesMap[q.symbol] = q; });

  const totalInvested = 100000;
  let totalCurrent = 0;
  const holdings = PORTFOLIO_HOLDINGS.map(h => {
    const q = quotesMap[h.symbol];
    const currentPrice = q ? convert(q.regularMarketPrice) : convert(h.avgCost);
    const costBasis = h.shares * convert(h.avgCost);
    const marketValue = h.shares * currentPrice;
    const pnl = marketValue - costBasis;
    const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
    totalCurrent += marketValue;
    return { ...h, quote: q, currentPrice, costBasis, marketValue, pnl, pnlPct };
  });

  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPct = (totalPnl / totalInvested) * 100;

  const COLORS = ["hsl(var(--primary))", "hsl(var(--stock-up))", "#6366f1", "#f59e0b", "#ec4899", "#14b8a6", "#8b5cf6", "#f97316", "#06b6d4", "#84cc16", "#ef4444", "#a855f7", "#3b82f6", "#eab308", "#22c55e"];
  const pieData = holdings.map((h, i) => ({ name: h.symbol, value: h.marketValue, color: COLORS[i % COLORS.length] }));

  return (
    <div className="space-y-4">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Portfolio Value</p>
          <p className="font-mono text-2xl font-bold text-foreground">{currSym}{totalCurrent.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total P&L</p>
          <p className={`font-mono text-2xl font-bold ${totalPnl >= 0 ? "text-stock-up" : "text-stock-down"}`}>
            {totalPnl >= 0 ? "+" : ""}{currSym}{totalPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className={`text-xs font-mono ${totalPnl >= 0 ? "text-stock-up" : "text-stock-down"}`}>
            {totalPnl >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}%
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Holdings</p>
          <p className="font-mono text-2xl font-bold text-foreground">{PORTFOLIO_HOLDINGS.length}</p>
          <p className="text-xs text-muted-foreground">Diversified stocks</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Cost Basis</p>
          <p className="font-mono text-2xl font-bold text-foreground">{currSym}100,000</p>
          <p className="text-xs text-muted-foreground">Initial investment</p>
        </div>
      </div>

      {/* Allocation pie chart */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-bold text-foreground mb-3">Portfolio Allocation</h3>
        <div className="flex items-center gap-6">
          <ResponsiveContainer width={200} height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" strokeWidth={1} stroke="hsl(var(--background))">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${currSym}${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, "Value"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 grid grid-cols-3 gap-x-4 gap-y-1">
            {holdings.map((h, i) => (
              <div key={h.symbol} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-[10px] font-mono text-foreground">{h.symbol}</span>
                <span className="text-[9px] text-muted-foreground">{h.allocation}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/30">
          <Briefcase className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Holdings</h3>
          {isLoading && <Loader2 className="h-3 w-3 animate-spin text-primary ml-auto" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/20 text-muted-foreground">
                <th className="text-left px-4 py-2 font-medium">Stock</th>
                <th className="text-right px-3 py-2 font-medium">Shares</th>
                <th className="text-right px-3 py-2 font-medium">Price</th>
                <th className="text-right px-3 py-2 font-medium">Mkt Value</th>
                <th className="text-right px-3 py-2 font-medium">P&L</th>
                <th className="text-right px-3 py-2 font-medium">%</th>
                <th className="text-right px-4 py-2 font-medium">Alloc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {holdings.map(h => (
                <tr key={h.symbol} className="hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => window.location.href = `/stock/${h.symbol}`}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <StockLogo symbol={h.symbol} size={20} />
                      <div>
                        <span className="font-mono font-bold text-foreground">{h.symbol}</span>
                        <p className="text-[9px] text-muted-foreground">{h.quote?.shortName || ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-right px-3 py-2.5 font-mono text-foreground">{h.shares}</td>
                  <td className="text-right px-3 py-2.5 font-mono text-foreground">{currSym}{h.currentPrice.toFixed(2)}</td>
                  <td className="text-right px-3 py-2.5 font-mono text-foreground">{currSym}{h.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className={`text-right px-3 py-2.5 font-mono font-semibold ${h.pnl >= 0 ? "text-stock-up" : "text-stock-down"}`}>
                    {h.pnl >= 0 ? "+" : ""}{currSym}{h.pnl.toFixed(0)}
                  </td>
                  <td className={`text-right px-3 py-2.5 font-mono ${h.pnl >= 0 ? "text-stock-up" : "text-stock-down"}`}>
                    {h.pnl >= 0 ? "+" : ""}{h.pnlPct.toFixed(1)}%
                  </td>
                  <td className="text-right px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${h.allocation * 100 / 12}%` }} />
                      </div>
                      <span className="text-muted-foreground font-mono">{h.allocation}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Index = () => {
  const [tab, setTab] = useState<"data" | "insights" | "portfolio" | "map">("data");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          <div className="mr-4 flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold tracking-tight text-foreground">FinTrack</span>
          </div>
          <StockSearch />

          <div className="ml-4 flex items-center gap-1 rounded-lg bg-muted p-1">
            {[
              { key: "data" as const, label: "Data", icon: BarChart3 },
              { key: "insights" as const, label: "Insights", icon: Target },
              { key: "portfolio" as const, label: "My Portfolio", icon: Briefcase },
              { key: "map" as const, label: "Ops Map", icon: Globe },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  tab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}>
                <t.icon className="h-4 w-4" />{t.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {(tab === "data" || tab === "portfolio") && <CurrencySelector />}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4">
        {tab === "data" && <MarketOverview />}
        {tab === "insights" && <InsightsTab />}
        {tab === "portfolio" && <PortfolioTab />}
        {tab === "map" && (
          <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <GlobeView />
          </Suspense>
        )}
      </main>

      <footer className="mt-8 border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          <p>
            {tab === "data" ? "Market data provided by Yahoo Finance. Prices may be delayed." :
             tab === "insights" ? "Prediction market data via Polymarket. AI analysis powered by Claude." :
             tab === "portfolio" ? "Simulated portfolio for demonstration. Not financial advice." :
             "Ops map data via ADSB.lol · Digitraffic · NWS · Satellite feeds."}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
