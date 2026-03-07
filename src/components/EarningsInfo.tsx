import { useEarnings } from "@/hooks/useStockData";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Calendar, BarChart3 } from "lucide-react";

interface EarningsInfoProps {
  symbol: string;
}

const EarningsInfo = ({ symbol }: EarningsInfoProps) => {
  const { data: earnings, isLoading, error } = useEarnings(symbol);
  const { symbol: currSym } = useCurrency();

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 md:p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Earnings
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (error || !earnings?.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 md:p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Earnings
        </h2>
        <p className="text-sm text-muted-foreground">
          {error ? "Failed to load earnings data" : "No earnings data available for this symbol"}
        </p>
      </div>
    );
  }

  // All earnings from Finnhub are historical (have epsActual)
  const past = earnings.filter((e) => e.epsActual != null).slice(0, 8);
  const upcoming = earnings.find((e) => e.epsActual == null && e.date > Date.now() / 1000);

  return (
    <div className="bg-card border border-border rounded-lg p-4 md:p-6">
      <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        Earnings History
      </h2>

      {/* Next earnings date */}
      {upcoming && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-secondary/50 rounded-lg">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-sm text-foreground">Next Earnings:</span>
          <span className="font-mono text-sm font-semibold text-primary">
            {new Date(upcoming.date * 1000).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      )}

      {/* Past earnings */}
      {past.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2 text-[10px] text-muted-foreground font-medium px-3 mb-1">
            <span>Date</span>
            <span className="text-right">EPS Actual</span>
            <span className="text-right">EPS Est.</span>
            <span className="text-right">Surprise</span>
          </div>
          <div className="grid gap-2">
            {past.map((e, i) => {
              const beat =
                e.epsActual != null && e.epsEstimate != null
                  ? e.epsActual >= e.epsEstimate
                  : null;
              const surprise =
                e.epsActual != null && e.epsEstimate != null && e.epsEstimate !== 0
                  ? ((e.epsActual - e.epsEstimate) / Math.abs(e.epsEstimate)) * 100
                  : null;

              return (
                <div
                  key={i}
                  className="grid grid-cols-4 items-center gap-2 p-3 rounded-lg bg-secondary/30"
                >
                  <div className="flex items-center gap-2">
                    {beat !== null &&
                      (beat ? (
                        <TrendingUp className="h-3.5 w-3.5 text-stock-up flex-shrink-0" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-stock-down flex-shrink-0" />
                      ))}
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.date * 1000).toLocaleDateString(undefined, {
                        month: "short",
                        year: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="font-mono text-xs font-medium text-foreground text-right">
                    {currSym}{e.epsActual?.toFixed(2) ?? "—"}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground text-right">
                    {e.epsEstimate != null ? `${currSym}${e.epsEstimate.toFixed(2)}` : "—"}
                  </p>
                  <div className="text-right">
                    {surprise !== null ? (
                      <span
                        className={`font-mono text-xs font-semibold px-1.5 py-0.5 rounded ${
                          beat
                            ? "text-stock-up bg-stock-up/10"
                            : "text-stock-down bg-stock-down/10"
                        }`}
                      >
                        {surprise > 0 ? "+" : ""}
                        {surprise.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default EarningsInfo;
