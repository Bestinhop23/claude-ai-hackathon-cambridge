import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Zap, Loader2, ExternalLink, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { useMarketMovers, useMarketPicks, useMultiQuote, type YahooQuote, type MarketPick } from "@/hooks/useStockData";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getMarketStatusLabel, getMarketStatusColor } from "@/lib/market-hours";
import StockLogo from "./StockLogo";
import { Skeleton } from "./ui/skeleton";

/* ── Bond & Commodity symbols ───────────────────────────── */
const BOND_SYMBOLS = ["^TNX", "^TYX", "^FVX", "^IRX", "TLT", "SHY", "IEF", "AGG"];
const COMMODITY_SYMBOLS = ["GC=F", "SI=F", "CL=F", "NG=F", "HG=F", "PL=F", "ZC=F", "ZW=F"];
const EU_SYMBOLS = ["^FTSE", "^GDAXI", "^FCHI", "^AEX", "^IBEX", "^SSMI", "^STOXX50E", "^FTSEMIB.MI"];

const BOND_NAMES: Record<string, string> = {
  "^TNX": "10-Year Treasury Yield",
  "^TYX": "30-Year Treasury Yield",
  "^FVX": "5-Year Treasury Yield",
  "^IRX": "13-Week Treasury Bill",
  "TLT": "20+ Year Treasury Bond ETF",
  "SHY": "1-3 Year Treasury Bond ETF",
  "IEF": "7-10 Year Treasury Bond ETF",
  "AGG": "US Aggregate Bond ETF",
};

const COMMODITY_NAMES: Record<string, string> = {
  "GC=F": "Gold",
  "SI=F": "Silver",
  "CL=F": "Crude Oil WTI",
  "NG=F": "Natural Gas",
  "HG=F": "Copper",
  "PL=F": "Platinum",
  "ZC=F": "Corn",
  "ZW=F": "Wheat",
};

const EU_NAMES: Record<string, string> = {
  "^FTSE": "FTSE 100 (London)",
  "^GDAXI": "DAX (Frankfurt)",
  "^FCHI": "CAC 40 (Paris)",
  "^AEX": "AEX (Amsterdam)",
  "^IBEX": "IBEX 35 (Madrid)",
  "^SSMI": "SMI (Zurich)",
  "^STOXX50E": "Euro Stoxx 50",
  "^FTSEMIB.MI": "FTSE MIB (Milan)",
};

/* ── Compact row for winners/losers ─────────────────────── */

function MoverRow({ q, rank, currSym, convert }: {
  q: YahooQuote; rank: number; currSym: string; convert: (v: number) => number;
}) {
  const navigate = useNavigate();
  const up = q.regularMarketChangePercent >= 0;

  return (
    <button
      onClick={() => navigate(`/stock/${q.symbol}`)}
      className="flex items-center gap-2 px-3 py-2 hover:bg-secondary/60 transition-colors w-full text-left group"
    >
      <span className="font-mono text-[10px] text-muted-foreground w-4 text-right">{rank}</span>
      <StockLogo symbol={q.symbol} size={20} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
            {q.symbol}
          </span>
          <span className="text-[10px] text-muted-foreground truncate">{q.shortName || q.longName || ""}</span>
        </div>
      </div>
      <span className="font-mono text-xs text-foreground tabular-nums">
        {currSym}{convert(q.regularMarketPrice).toFixed(2)}
      </span>
      <span className={`font-mono text-xs font-semibold tabular-nums min-w-[60px] text-right flex items-center justify-end gap-0.5 ${
        up ? "text-stock-up" : "text-stock-down"
      }`}>
        {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {up ? "+" : ""}{q.regularMarketChangePercent.toFixed(2)}%
      </span>
    </button>
  );
}

/* ── Asset row for bonds/commodities ────────────────────── */

function AssetRow({ q, name, currSym, convert }: {
  q: YahooQuote; name: string; currSym: string; convert: (v: number) => number;
}) {
  const navigate = useNavigate();
  const up = (q.regularMarketChangePercent ?? 0) >= 0;
  const isYield = q.symbol.startsWith("^");

  return (
    <button
      onClick={() => navigate(`/stock/${q.symbol}`)}
      className="flex items-center gap-2 px-3 py-2 hover:bg-secondary/60 transition-colors w-full text-left group"
    >
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{name}</span>
        <span className="text-[10px] text-muted-foreground ml-1.5">{q.symbol}</span>
      </div>
      <span className="font-mono text-xs text-foreground tabular-nums">
        {isYield ? `${q.regularMarketPrice.toFixed(3)}%` : `${currSym}${convert(q.regularMarketPrice).toFixed(2)}`}
      </span>
      <span className={`font-mono text-[10px] font-semibold tabular-nums min-w-[50px] text-right ${up ? "text-stock-up" : "text-stock-down"}`}>
        {up ? "+" : ""}{(q.regularMarketChangePercent ?? 0).toFixed(2)}%
      </span>
    </button>
  );
}

/* ── Pick card ──────────────────────────────────────────── */

function PickCard({ pick, currSym, convert }: {
  pick: MarketPick; currSym: string; convert: (v: number) => number;
}) {
  const navigate = useNavigate();
  const bullish = pick.direction === "BULLISH";

  return (
    <button
      onClick={() => navigate(`/stock/${pick.symbol}`)}
      className="w-full text-left px-3 py-2.5 hover:bg-secondary/60 transition-colors group border-b border-border/50 last:border-0"
    >
      <div className="flex items-start gap-2">
        <StockLogo symbol={pick.symbol} size={20} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-mono text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
              {pick.symbol}
            </span>
            <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
              bullish ? "bg-stock-up/15 text-stock-up" : "bg-stock-down/15 text-stock-down"
            }`}>
              {bullish ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
              {pick.direction}
            </span>
            {pick.quote && (
              <span className="ml-auto font-mono text-[10px] text-muted-foreground tabular-nums">
                {currSym}{convert(pick.quote.regularMarketPrice).toFixed(2)}
                <span className={`ml-1 ${(pick.quote.regularMarketChangePercent ?? 0) >= 0 ? "text-stock-up" : "text-stock-down"}`}>
                  {(pick.quote.regularMarketChangePercent ?? 0) >= 0 ? "+" : ""}
                  {pick.quote.regularMarketChangePercent?.toFixed(2)}%
                </span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-foreground/80 leading-snug mb-1">{pick.thesis}</p>
          <p className="text-[9px] text-muted-foreground flex items-center gap-1 truncate">
            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{pick.newsTitle}</span>
            <span className="shrink-0">— {pick.newsSource}</span>
          </p>
        </div>
      </div>
    </button>
  );
}

/* ── Column header ──────────────────────────────────────── */

function ColHeader({ icon, title, subtitle }: {
  icon: React.ReactNode; title: string; subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-secondary/30">
      {icon}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</h2>
        {subtitle && <p className="text-[9px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ── Loading skeleton ───────────────────────────────────── */

function ColumnSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-3 w-16" />
          <div className="flex-1" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────── */

const MarketOverview = () => {
  const { data: movers, isLoading: moversLoading } = useMarketMovers();
  const { data: picks, isLoading: picksLoading } = useMarketPicks();
  const { data: bondQuotes, isLoading: bondsLoading } = useMultiQuote(BOND_SYMBOLS);
  const { data: commodityQuotes, isLoading: commoditiesLoading } = useMultiQuote(COMMODITY_SYMBOLS);
  const { convert, symbol: currSym } = useCurrency();

  const statusLabel = getMarketStatusLabel();
  const statusColor = getMarketStatusColor();

  return (
    <div className="space-y-4">
      {/* Market status + Macro banner */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className={`flex items-center gap-1.5 text-xs font-medium ${statusColor}`}>
          <Clock className="h-3.5 w-3.5" />
          {statusLabel}
        </div>
        {picks?.macro && (
          <div className="flex-1 bg-secondary/40 border border-border rounded-lg px-4 py-2.5 flex items-start gap-2">
            <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-foreground/80 leading-relaxed">{picks.macro}</p>
          </div>
        )}
      </div>

      {/* 3-column terminal grid: Losers | Winners | Picks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border border-border rounded-lg overflow-hidden bg-card">
        <div className="border-b lg:border-b-0 lg:border-r border-border">
          <ColHeader icon={<TrendingDown className="h-4 w-4 text-stock-down" />} title="Top Losers" subtitle="Biggest decliners today" />
          {moversLoading ? <ColumnSkeleton /> : (
            <div>{(movers?.losers || []).map((q, i) => <MoverRow key={q.symbol} q={q} rank={i + 1} currSym={currSym} convert={convert} />)}</div>
          )}
        </div>

        <div className="border-b lg:border-b-0 lg:border-r border-border">
          <ColHeader icon={<TrendingUp className="h-4 w-4 text-stock-up" />} title="Top Winners" subtitle="Biggest gainers today" />
          {moversLoading ? <ColumnSkeleton /> : (
            <div>{(movers?.winners || []).map((q, i) => <MoverRow key={q.symbol} q={q} rank={i + 1} currSym={currSym} convert={convert} />)}</div>
          )}
        </div>

        <div>
          <ColHeader icon={<Zap className="h-4 w-4 text-primary" />} title="Picks" subtitle="AI-driven contextual picks" />
          {picksLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-[10px] text-muted-foreground">Analyzing macro context…</p>
            </div>
          ) : (
            <div>{(picks?.picks || []).map((p, i) => <PickCard key={p.symbol + i} pick={p} currSym={currSym} convert={convert} />)}</div>
          )}
        </div>
      </div>

      {/* Bonds & Commodities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <ColHeader icon={<span className="text-amber-500 text-sm font-bold">🏦</span>} title="Bonds & Treasuries" subtitle="Yields and bond ETFs" />
          {bondsLoading ? <ColumnSkeleton rows={8} /> : (
            <div>
              {(bondQuotes || []).map(q => (
                <AssetRow key={q.symbol} q={q} name={BOND_NAMES[q.symbol] || q.shortName || q.symbol} currSym={currSym} convert={convert} />
              ))}
            </div>
          )}
        </div>

        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <ColHeader icon={<span className="text-orange-500 text-sm font-bold">⛏️</span>} title="Commodities" subtitle="Futures and spot prices" />
          {commoditiesLoading ? <ColumnSkeleton rows={8} /> : (
            <div>
              {(commodityQuotes || []).map(q => (
                <AssetRow key={q.symbol} q={q} name={COMMODITY_NAMES[q.symbol] || q.shortName || q.symbol} currSym={currSym} convert={convert} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketOverview;
