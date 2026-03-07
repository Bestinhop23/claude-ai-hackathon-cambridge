import { useState } from "react";
import { Activity, BarChart3, Loader2, Briefcase, DollarSign } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import ThemeToggle from "@/components/ThemeToggle";
import CurrencySelector from "@/components/CurrencySelector";
import StockSearch from "@/components/StockSearch";
import MarketOverview from "@/components/MarketOverview";
import StockLogo from "@/components/StockLogo";
import { useMultiQuote, type YahooQuote } from "@/hooks/useStockData";
import { useCurrency } from "@/contexts/CurrencyContext";

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
  const [tab, setTab] = useState<"data" | "portfolio">("data");
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
              { key: "portfolio" as const, label: "My Portfolio", icon: Briefcase },
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
            <CurrencySelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4">
        {tab === "data" && <MarketOverview />}
        {tab === "portfolio" && <PortfolioTab />}
      </main>

      <footer className="mt-8 border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          <p>
            {tab === "data" ? "Market data provided by Yahoo Finance. Prices may be delayed." :
             "Simulated portfolio for demonstration. Not financial advice."}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
