"use client";

import { createContext, useContext, useMemo, useState } from "react";

type CurrencyContextValue = {
  currency: string;
  setCurrency: (currency: string) => void;
  rates: Record<string, number>;
  convert: (value: number) => number;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const defaultRates = { USD: 1, EUR: 0.92, GBP: 0.78, INR: 87.2, JPY: 149.6 };

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState(() => {
    if (typeof window === "undefined") {
      return "USD";
    }

    return window.localStorage.getItem("clearview-currency") ?? "USD";
  });

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      setCurrency: (next) => {
        setCurrencyState(next);
        window.localStorage.setItem("clearview-currency", next);
      },
      rates: defaultRates,
      convert: (amount) => amount * (defaultRates[currency as keyof typeof defaultRates] ?? 1),
    }),
    [currency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }

  return context;
}
