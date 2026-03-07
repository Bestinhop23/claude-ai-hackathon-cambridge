"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const examples = ["NVDA", "AI infrastructure", "AAPL MSFT QQQ"];

export function QueryForm({ initialQuery = "", initialMode = "concise" }: { initialQuery?: string; initialMode?: "concise" | "detailed" }) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  const submit = (mode: "concise" | "detailed") => {
    if (!query.trim()) {
      return;
    }

    router.push(`/analysis?query=${encodeURIComponent(query.trim())}&mode=${mode}`);
  };

  return (
    <div className="space-y-4">
      <div className="glass rounded-[32px] p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            aria-label="Ticker, theme, or watchlist"
            placeholder="Enter a ticker, market theme, or watchlist"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-14 flex-1 rounded-[24px] border-transparent bg-white"
          />
          <div className="flex gap-2">
            <Button size="lg" onClick={() => submit(initialMode)}>
              Analyze
              <ArrowRight className="ml-2 size-4" />
            </Button>
            <Button size="lg" variant="secondary" onClick={() => submit(initialMode === "concise" ? "detailed" : "concise")}>
              {initialMode === "concise" ? "Detailed" : "Concise"}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
        <Sparkles className="size-4" />
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setQuery(example)}
            className="rounded-full border border-[var(--border)] bg-white/55 px-3 py-1.5 transition hover:bg-white"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
