"use client";

import { useCurrency } from "@/components/providers/currency-provider";

export function CurrencySelector() {
  const { currency, setCurrency, rates } = useCurrency();

  return (
    <select
      value={currency}
      onChange={(event) => setCurrency(event.target.value)}
      className="h-10 rounded-full border border-[var(--border)] bg-white/70 px-4 text-sm dark:bg-black/20"
      aria-label="Currency selector"
    >
      {Object.keys(rates).map((code) => (
        <option key={code} value={code}>
          {code}
        </option>
      ))}
    </select>
  );
}
