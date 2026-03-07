import { parseTickerInput } from "@/lib/utils";

export function interpretQuery(query: string) {
  const trimmed = query.trim();
  const upper = trimmed.toUpperCase();
  const symbols = parseTickerInput(trimmed);

  if (/^[A-Z.\-]{1,6}$/.test(upper)) {
    return {
      kind: "ticker" as const,
      primaryTicker: upper,
      queryLabel: upper,
      symbols: [upper],
    };
  }

  if (symbols.length > 1 && symbols.length <= 6 && /^[A-Z.\-\s,]+$/.test(trimmed.toUpperCase())) {
    return {
      kind: "watchlist" as const,
      primaryTicker: symbols[0],
      queryLabel: trimmed,
      symbols,
    };
  }

  return {
    kind: "theme" as const,
    primaryTicker: "NVDA",
    queryLabel: trimmed,
    symbols: [],
  };
}
