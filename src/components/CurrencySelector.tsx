import { useCurrency, type CurrencyCode } from "@/contexts/CurrencyContext";

const CURRENCIES: { code: CurrencyCode; label: string }[] = [
  { code: "USD", label: "$ USD" },
  { code: "EUR", label: "€ EUR" },
  { code: "GBP", label: "£ GBP" },
  { code: "INR", label: "₹ INR" },
  { code: "JPY", label: "¥ JPY" },
  { code: "CAD", label: "C$ CAD" },
  { code: "AUD", label: "A$ AUD" },
  { code: "CHF", label: "CHF" },
];

const CurrencySelector = () => {
  const { currency, setCurrency } = useCurrency();

  return (
    <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
      className="bg-secondary text-foreground text-xs font-medium rounded-md px-2 py-1.5 border border-border focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.label}
        </option>
      ))}
    </select>
  );
};

export default CurrencySelector;
