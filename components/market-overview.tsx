"use client";

import { useMultiQuote } from "@/hooks/use-stock-data";
import { StockCard } from "@/components/stock-card";

export function MarketOverview() {
  const { data } = useMultiQuote(["SPY", "QQQ", "NVDA", "MSFT"]);
  const quotes = (data?.data as Array<{ symbol: string; shortName: string; price: number; changePercent: number }> | undefined) ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {quotes.map((quote) => (
        <StockCard key={quote.symbol} {...quote} />
      ))}
    </div>
  );
}
