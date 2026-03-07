import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Zap, Loader2, ExternalLink, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useMarketMovers, useMarketPicks, type YahooQuote, type MarketPick } from "@/hooks/useStockData";
import { useCurrency } from "@/contexts/CurrencyContext";
import StockLogo from "./StockLogo";
import { Skeleton } from "./ui/skeleton";

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

/* ── Pick card with news citation ───────────────────────── */

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
              bullish
                ? "bg-stock-up/15 text-stock-up"
                : "bg-stock-down/15 text-stock-down"
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
  const { convert, symbol: currSym } = useCurrency();

  return (
    <div className="space-y-4">
      {/* Macro banner */}
      {picks?.macro && (
        <div className="bg-secondary/40 border border-border rounded-lg px-4 py-2.5 flex items-start gap-2">
          <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-foreground/80 leading-relaxed">{picks.macro}</p>
        </div>
      )}

      {/* 3-column terminal grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-0 border border-border rounded-lg overflow-hidden bg-card">
        {/* ── Top Losers ───────────────────────────────── */}
        <div className="border-b lg:border-b-0 lg:border-r border-border">
          <ColHeader
            icon={<TrendingDown className="h-4 w-4 text-stock-down" />}
            title="Top Losers"
            subtitle="Biggest decliners today"
          />
          {moversLoading ? <ColumnSkeleton /> : (
            <div>
              {(movers?.losers || []).map((q, i) => (
                <MoverRow key={q.symbol} q={q} rank={i + 1} currSym={currSym} convert={convert} />
              ))}
              {(movers?.losers || []).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">No data</p>
              )}
            </div>
          )}
        </div>

        {/* ── Top Winners ──────────────────────────────── */}
        <div className="border-b lg:border-b-0 lg:border-r border-border">
          <ColHeader
            icon={<TrendingUp className="h-4 w-4 text-stock-up" />}
            title="Top Winners"
            subtitle="Biggest gainers today"
          />
          {moversLoading ? <ColumnSkeleton /> : (
            <div>
              {(movers?.winners || []).map((q, i) => (
                <MoverRow key={q.symbol} q={q} rank={i + 1} currSym={currSym} convert={convert} />
              ))}
              {(movers?.winners || []).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">No data</p>
              )}
            </div>
          )}
        </div>

        {/* ── AI Picks ─────────────────────────────────── */}
        <div>
          <ColHeader
            icon={<Zap className="h-4 w-4 text-primary" />}
            title="Picks"
            subtitle="AI-driven contextual picks"
          />
          {picksLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-[10px] text-muted-foreground">Analyzing macro context…</p>
            </div>
          ) : (
            <div>
              {(picks?.picks || []).map((p, i) => (
                <PickCard key={p.symbol + i} pick={p} currSym={currSym} convert={convert} />
              ))}
              {(picks?.picks || []).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">No picks available</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketOverview;
