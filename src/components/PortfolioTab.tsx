import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Briefcase, Loader2, Plus, Trash2, Search, Upload, Calendar, DollarSign, ArrowUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMultiQuote, useSymbolSearch, type YahooQuote } from "@/hooks/useStockData";
import { useCurrency } from "@/contexts/CurrencyContext";
import StockLogo from "@/components/StockLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface Holding {
  id: string;
  symbol: string;
  asset_type: string;
  shares: number;
  avg_cost: number;
}

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--stock-up))", "#6366f1", "#f59e0b", "#ec4899",
  "#14b8a6", "#8b5cf6", "#f97316", "#06b6d4", "#84cc16", "#ef4444", "#a855f7",
];

const ASSET_TYPE_LABELS: Record<string, string> = {
  equity: "Equity",
  bond: "Bond",
  commodity: "Commodity",
  cash: "Cash",
};

const PortfolioTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { convert, symbol: currSym } = useCurrency();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const fetchHoldings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("portfolio_holdings")
      .select("*")
      .order("created_at", { ascending: true });
    if (!error && data) setHoldings(data as Holding[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchHoldings(); }, [fetchHoldings]);

  const symbols = holdings.filter(h => h.asset_type !== "cash").map(h => h.symbol);
  const { data: quotes } = useMultiQuote(symbols);
  const quotesMap: Record<string, YahooQuote> = {};
  (quotes || []).forEach(q => { if (q.symbol) quotesMap[q.symbol] = q; });

  let totalCost = 0;
  let totalCurrent = 0;
  const enriched = holdings.map(h => {
    if (h.asset_type === "cash") {
      const value = h.shares * convert(h.avg_cost);
      totalCost += value;
      totalCurrent += value;
      return { ...h, quote: null as YahooQuote | null, currentPrice: convert(h.avg_cost), costBasis: value, marketValue: value, pnl: 0, pnlPct: 0 };
    }
    const q = quotesMap[h.symbol];
    const currentPrice = q ? convert(q.regularMarketPrice) : convert(h.avg_cost);
    const costBasis = h.shares * convert(h.avg_cost);
    const marketValue = h.shares * currentPrice;
    const pnl = marketValue - costBasis;
    const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
    totalCost += costBasis;
    totalCurrent += marketValue;
    return { ...h, quote: q, currentPrice, costBasis, marketValue, pnl, pnlPct };
  });

  const totalPnl = totalCurrent - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const pieData = enriched.map((h, i) => ({ name: h.asset_type === "cash" ? "Cash" : h.symbol, value: h.marketValue, color: COLORS[i % COLORS.length] }));

  const removeHolding = async (id: string) => {
    await supabase.from("portfolio_holdings").delete().eq("id", id);
    setHoldings(prev => prev.filter(h => h.id !== id));
    toast({ title: "Removed from portfolio" });
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Briefcase className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Sign in to create your portfolio</p>
        <Button onClick={() => navigate("/auth")}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
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
          <p className="font-mono text-2xl font-bold text-foreground">{holdings.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Cost Basis</p>
          <p className="font-mono text-2xl font-bold text-foreground">{currSym}{totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      {/* Pie chart */}
      {enriched.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-bold text-foreground mb-3">Portfolio Allocation</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" strokeWidth={1} stroke="hsl(var(--background))">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`${currSym}${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, "Value"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 grid grid-cols-3 gap-x-4 gap-y-1">
              {enriched.map((h, i) => {
                const alloc = totalCurrent > 0 ? ((h.marketValue / totalCurrent) * 100).toFixed(1) : "0";
                return (
                  <div key={h.id} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] font-mono text-foreground">{h.asset_type === "cash" ? "Cash" : h.symbol}</span>
                    <span className="text-[9px] text-muted-foreground">{alloc}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Holdings table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/30">
          <Briefcase className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Holdings</h3>
          {loading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
          <div className="ml-auto flex items-center gap-1.5">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowImport(!showImport)}>
              <Upload className="h-3 w-3 mr-1" />Import
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAdd(!showAdd)}>
              <Plus className="h-3 w-3 mr-1" />Add
            </Button>
          </div>
        </div>

        {showImport && <ImportForm onImported={() => { fetchHoldings(); setShowImport(false); }} />}
        {showAdd && <AddHoldingForm onAdded={() => { fetchHoldings(); setShowAdd(false); }} />}

        {enriched.length === 0 && !loading ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground gap-2">
            <Briefcase className="h-8 w-8" />
            <p className="text-sm">No holdings yet. Add your first asset!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/20 text-muted-foreground">
                  <th className="text-left px-4 py-2 font-medium">Asset</th>
                  <th className="text-left px-3 py-2 font-medium">Type</th>
                  <th className="text-right px-3 py-2 font-medium">Shares</th>
                  <th className="text-right px-3 py-2 font-medium">Price</th>
                  <th className="text-right px-3 py-2 font-medium">Value</th>
                  <th className="text-right px-3 py-2 font-medium">P&L</th>
                  <th className="text-right px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {enriched.map(h => (
                  <tr key={h.id} className="hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => h.asset_type !== "cash" ? navigate(`/stock/${h.symbol}`) : undefined}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {h.asset_type === "cash" ? (
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center"><DollarSign className="h-3 w-3 text-primary" /></div>
                        ) : (
                          <StockLogo symbol={h.symbol} size={20} />
                        )}
                        <div>
                          <span className="font-mono font-bold text-foreground">{h.asset_type === "cash" ? "Cash" : h.symbol}</span>
                          <p className="text-[9px] text-muted-foreground">{h.asset_type === "cash" ? h.symbol : h.quote?.shortName || ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                        h.asset_type === "equity" ? "bg-primary/10 text-primary" :
                        h.asset_type === "bond" ? "bg-amber-500/10 text-amber-500" :
                        h.asset_type === "cash" ? "bg-stock-up/10 text-stock-up" :
                        "bg-orange-500/10 text-orange-500"
                      }`}>{ASSET_TYPE_LABELS[h.asset_type] || h.asset_type}</span>
                    </td>
                    <td className="text-right px-3 py-2.5 font-mono text-foreground">{h.asset_type === "cash" ? "—" : h.shares}</td>
                    <td className="text-right px-3 py-2.5 font-mono text-foreground">{currSym}{h.currentPrice.toFixed(2)}</td>
                    <td className="text-right px-3 py-2.5 font-mono text-foreground">{currSym}{h.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className={`text-right px-3 py-2.5 font-mono font-semibold ${h.pnl >= 0 ? "text-stock-up" : "text-stock-down"}`}>
                      {h.asset_type === "cash" ? "—" : `${h.pnl >= 0 ? "+" : ""}${currSym}${h.pnl.toFixed(0)} (${h.pnl >= 0 ? "+" : ""}${h.pnlPct.toFixed(1)}%)`}
                    </td>
                    <td className="text-right px-4 py-2.5" onClick={e => e.stopPropagation()}>
                      <button onClick={() => removeHolding(h.id)} className="text-muted-foreground hover:text-stock-down transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Import Form (Trading 212 & Robinhood CSV) ──────────── */

function ImportForm({ onImported }: { onImported: () => void }) {
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target?.result as string || "");
    reader.readAsText(file);
  };

  const parseAndImport = async () => {
    if (!csvText.trim()) return;
    setImporting(true);
    try {
      const lines = csvText.trim().split("\n");
      const header = lines[0].toLowerCase();
      const rows = lines.slice(1);

      const holdings: { symbol: string; shares: number; avg_cost: number }[] = [];

      for (const row of rows) {
        const cols = row.split(",").map(c => c.trim().replace(/"/g, ""));
        if (cols.length < 3) continue;

        // Trading 212 format: Ticker, Shares Owned, Average Price
        // Robinhood format: Instrument, Quantity, Average Cost
        if (header.includes("ticker") || header.includes("instrument")) {
          const symbolIdx = header.includes("ticker") ? findColIndex(header, "ticker") : findColIndex(header, "instrument");
          const sharesIdx = header.includes("shares") ? findColIndex(header, "shares") : findColIndex(header, "quantity");
          const costIdx = header.includes("average price") ? findColIndex(header, "average price") : findColIndex(header, "average cost");
          
          const sym = cols[symbolIdx];
          const shares = parseFloat(cols[sharesIdx]);
          const cost = parseFloat(cols[costIdx]);
          
          if (sym && !isNaN(shares) && shares > 0 && !isNaN(cost) && cost > 0) {
            holdings.push({ symbol: sym.toUpperCase(), shares, avg_cost: cost });
          }
        }
      }

      if (holdings.length === 0) {
        toast({ title: "No valid holdings found", description: "Check your CSV format. Supported: Trading 212, Robinhood exports.", variant: "destructive" });
        setImporting(false);
        return;
      }

      const userId = (await supabase.auth.getUser()).data.user?.id;
      for (const h of holdings) {
        await supabase.from("portfolio_holdings").upsert({
          user_id: userId,
          symbol: h.symbol,
          asset_type: "equity",
          shares: h.shares,
          avg_cost: h.avg_cost,
        }, { onConflict: "user_id,symbol" });
      }

      toast({ title: `Imported ${holdings.length} holdings` });
      onImported();
    } catch (err: any) {
      toast({ title: "Import error", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="px-4 py-3 border-b border-border bg-secondary/10 space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Upload className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">Import from Trading 212 or Robinhood</span>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Export your portfolio as CSV from your broker (Trading 212: Portfolio → Export | Robinhood: Account → Documents → Download), then upload or paste below.
      </p>
      <div className="flex gap-2 items-start">
        <div className="flex-1 space-y-2">
          <Input type="file" accept=".csv" className="h-8 text-xs" onChange={handleFileUpload} />
          <textarea
            placeholder="Or paste CSV content here..."
            className="w-full h-20 text-xs rounded-md border border-input bg-background px-3 py-2 resize-none"
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
          />
        </div>
        <Button size="sm" className="h-8 text-xs" onClick={parseAndImport} disabled={importing || !csvText.trim()}>
          {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Import"}
        </Button>
      </div>
    </div>
  );
}

function findColIndex(header: string, keyword: string): number {
  const cols = header.split(",").map(c => c.trim().replace(/"/g, ""));
  return cols.findIndex(c => c.includes(keyword));
}

/* ── Add Holding Form ───────────────────────────────────── */

function AddHoldingForm({ onAdded }: { onAdded: () => void }) {
  const [query, setQuery] = useState("");
  const [assetType, setAssetType] = useState<"equity" | "bond" | "commodity" | "cash">("equity");
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [cashLabel, setCashLabel] = useState("USD");
  const [saving, setSaving] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const { data: results } = useSymbolSearch(assetType !== "cash" ? query : "");

  const handleSave = async () => {
    if (assetType === "cash") {
      if (!shares) return;
      setSaving(true);
      const { error } = await supabase.from("portfolio_holdings").upsert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        symbol: cashLabel.toUpperCase(),
        asset_type: "cash",
        shares: parseFloat(shares),
        avg_cost: 1,
      }, { onConflict: "user_id,symbol" });
      setSaving(false);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: `Added ${cashLabel.toUpperCase()} cash` });
        onAdded();
      }
      return;
    }

    if (!selectedSymbol || !shares || !avgCost) return;
    setSaving(true);
    const { error } = await supabase.from("portfolio_holdings").upsert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      symbol: selectedSymbol.toUpperCase(),
      asset_type: assetType,
      shares: parseFloat(shares),
      avg_cost: parseFloat(avgCost),
    }, { onConflict: "user_id,symbol" });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Added ${selectedSymbol.toUpperCase()}` });
      onAdded();
    }
  };

  return (
    <div className="px-4 py-3 border-b border-border bg-secondary/10 space-y-3">
      <div className="flex gap-2 items-center flex-wrap">
        <select value={assetType} onChange={e => { setAssetType(e.target.value as any); setSelectedSymbol(""); setQuery(""); }} className="h-8 text-xs rounded-md border border-input bg-background px-2">
          <option value="equity">Equity</option>
          <option value="bond">Bond</option>
          <option value="commodity">Commodity</option>
          <option value="cash">Cash</option>
        </select>

        {assetType === "cash" ? (
          <>
            <Input placeholder="Currency (e.g. USD, EUR)" className="w-28 h-8 text-xs" value={cashLabel} onChange={e => setCashLabel(e.target.value)} />
            <Input placeholder="Amount" type="number" className="w-24 h-8 text-xs" value={shares} onChange={e => setShares(e.target.value)} />
          </>
        ) : (
          <>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search symbol (e.g. AAPL, GC=F, TLT, VOD.L)"
                className="pl-8 h-8 text-xs"
                value={selectedSymbol || query}
                onChange={e => { setQuery(e.target.value); setSelectedSymbol(""); }}
              />
              {results && results.length > 0 && !selectedSymbol && (
                <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                  {results.map((r: any) => (
                    <button
                      key={r.symbol}
                      className="w-full px-3 py-2 text-left hover:bg-secondary/60 text-xs flex items-center gap-2"
                      onClick={() => { setSelectedSymbol(r.symbol); setQuery(""); }}
                    >
                      <span className="font-mono font-bold text-foreground">{r.symbol}</span>
                      <span className="text-muted-foreground truncate">{r.shortname || r.longname}</span>
                      {r.exchDisp && <span className="text-[9px] text-primary/60 ml-auto">{r.exchDisp}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Input placeholder="Shares" type="number" step="any" className="w-20 h-8 text-xs" value={shares} onChange={e => setShares(e.target.value)} />
            <Input placeholder="Avg Cost" type="number" step="any" className="w-24 h-8 text-xs" value={avgCost} onChange={e => setAvgCost(e.target.value)} />
          </>
        )}
        <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={saving || (assetType !== "cash" && !selectedSymbol)}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
        </Button>
      </div>
    </div>
  );
}

export default PortfolioTab;
