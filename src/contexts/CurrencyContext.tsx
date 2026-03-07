import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CurrencyCode = "USD" | "EUR" | "GBP" | "INR" | "JPY" | "CAD" | "AUD" | "CHF";

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  rates: Record<string, number>;
  convert: (usd: number) => number;
  symbol: string;
  loading: boolean;
}

const SYMBOLS: Record<CurrencyCode, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  JPY: "¥",
  CAD: "C$",
  AUD: "A$",
  CHF: "CHF",
};

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "USD",
  setCurrency: () => {},
  rates: {},
  convert: (v) => v,
  symbol: "$",
  loading: false,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchRates() {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("stock-data", {
          body: { action: "exchange-rates", params: {} },
        });
        if (!error && data?.rates) {
          setRates(data.rates);
        }
      } catch (_e) {
        // Fallback static rates
        setRates({
          USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.5,
          JPY: 149.5, CAD: 1.36, AUD: 1.53, CHF: 0.88,
        });
      }
      setLoading(false);
    }
    fetchRates();
  }, []);

  const convert = (usd: number) => {
    if (currency === "USD") return usd;
    const rate = rates[currency] || 1;
    return usd * rate;
  };

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, rates, convert, symbol: SYMBOLS[currency], loading }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
