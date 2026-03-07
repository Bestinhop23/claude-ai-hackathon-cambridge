"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useSymbolSearch } from "@/hooks/use-stock-data";
import { Input } from "@/components/ui/input";

export function StockSearch() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const router = useRouter();
  const { data } = useSymbolSearch(debounced);
  const results = (data?.data as Array<{ symbol: string; name: string }> | undefined) ?? [];

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(query), 250);
    return () => window.clearTimeout(timeout);
  }, [query]);

  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search symbol or company" className="pl-10" />
      {debounced && results.length > 0 ? (
        <div className="absolute z-20 mt-2 w-full rounded-[24px] border border-[var(--border)] bg-white p-2 shadow-xl">
          {results.slice(0, 6).map((result) => (
            <button
              key={result.symbol}
              type="button"
              onClick={() => router.push(`/stocks/${result.symbol}`)}
              className="block w-full rounded-2xl px-3 py-2 text-left hover:bg-[#f7f2e8]"
            >
              <span className="font-medium">{result.symbol}</span>
              <span className="ml-2 text-sm text-[var(--muted)]">{result.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
