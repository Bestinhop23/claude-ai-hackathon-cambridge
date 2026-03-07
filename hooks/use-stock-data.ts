"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api/client";

function useStockAction<T>(key: string, params: Record<string, string | undefined>, refetchInterval?: number) {
  const query = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])) as [string, string][],
  );

  return useQuery<T>({
    queryKey: [key, params],
    queryFn: () => fetchJson<T>(`/api/stock-data?${query.toString()}`),
    refetchInterval,
  });
}

export function useQuote(symbol: string) {
  return useStockAction<{ data: unknown[] }>("quote", { action: "quote", symbol }, 30000);
}

export function useMultiQuote(symbols: string[]) {
  return useStockAction<{ data: unknown[] }>("multi-quote", { action: "quote", symbols: symbols.join(",") }, 60000);
}

export function useChart(symbol: string, range = "1M") {
  return useStockAction<{ data: unknown[] }>("chart", { action: "chart", symbol, range });
}

export function useSymbolSearch(query: string) {
  return useStockAction<{ data: unknown[] }>("search", { action: "search", query });
}

export function useEarnings(symbol: string) {
  return useStockAction<{ data: unknown[] }>("earnings", { action: "earnings", symbol });
}

export function useCompanyProfile(symbol: string) {
  return useStockAction<{ data: unknown }>("company-profile", { action: "company-profile", symbol });
}

export function useNews(symbol: string) {
  return useStockAction<{ data: unknown[] }>("news", { action: "news", symbol });
}

export function useRelevantNews(symbol: string) {
  return useStockAction<{ data: { queries: string[]; articles: unknown[] } }>("relevant-news", { action: "relevant-news", symbol });
}

export function useSentiment(symbol: string) {
  return useStockAction<{ data: unknown }>("sentiment", { action: "sentiment", symbol });
}

export function useFlights() {
  return useStockAction<{ data: unknown[] }>("flights", { action: "flights" }, 30000);
}

export function useShips() {
  return useStockAction<{ data: unknown[] }>("ships", { action: "ships" }, 60000);
}

export function useExchangeRates() {
  return useStockAction<{ data: unknown }>("exchange-rates", { action: "exchange-rates" }, 300000);
}
