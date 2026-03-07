import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown } from "lucide-react";
import StockLogo from "./StockLogo";

interface StockCardProps {
  symbol: string;
  name: string;
  price?: number;
  change?: number;
  percentChange?: number;
  preMarketPrice?: number | null;
  postMarketPrice?: number | null;
  currencySymbol?: string;
  loading?: boolean;
}

const StockCard = ({
  symbol,
  name,
  price,
  change,
  percentChange,
  preMarketPrice,
  postMarketPrice,
  currencySymbol = "$",
  loading,
}: StockCardProps) => {
  const navigate = useNavigate();
  const isPositive = (change ?? 0) >= 0;
  
  // Simulated live ticker effect
  const [displayPrice, setDisplayPrice] = useState(price);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevPrice = useRef(price);
  
  useEffect(() => {
    if (price != null) {
      setDisplayPrice(price);
      prevPrice.current = price;
    }
  }, [price]);

  useEffect(() => {
    if (price == null) return;
    const interval = setInterval(() => {
      const base = price;
      const jitter = base * (Math.random() - 0.5) * 0.0004; // ±0.02% micro-tick
      const newPrice = base + jitter;
      const dir = newPrice > (prevPrice.current ?? base) ? "up" : "down";
      setDisplayPrice(newPrice);
      setFlash(dir);
      prevPrice.current = newPrice;
      setTimeout(() => setFlash(null), 200);
    }, 800 + Math.random() * 600); // faster: every 0.8-1.4s
    return () => clearInterval(interval);
  }, [price]);

  return (
    <button
      onClick={() => navigate(`/stock/${symbol}`)}
      className="w-full bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-all text-left group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <StockLogo symbol={symbol} size={28} />
          <div>
            <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
              {symbol}
            </h3>
            <p className="text-xs text-muted-foreground truncate max-w-[100px]">{name}</p>
          </div>
        </div>
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-stock-up" />
        ) : (
          <TrendingDown className="h-4 w-4 text-stock-down" />
        )}
      </div>

      {loading ? (
        <div className="space-y-1">
          <div className="h-5 w-20 bg-secondary rounded animate-pulse" />
          <div className="h-4 w-16 bg-secondary rounded animate-pulse" />
        </div>
      ) : (
        <>
          <p className={`font-mono text-lg font-bold transition-colors duration-300 ${
            flash === "up" ? "text-stock-up" : flash === "down" ? "text-stock-down" : "text-foreground"
          }`}>
            {currencySymbol}{displayPrice?.toFixed(2) ?? "—"}
          </p>
          <p
            className={`font-mono text-xs font-medium ${
              isPositive ? "text-stock-up" : "text-stock-down"
            }`}
          >
            {isPositive ? "+" : ""}
            {change?.toFixed(2) ?? "0.00"} ({isPositive ? "+" : ""}
            {percentChange?.toFixed(2) ?? "0.00"}%)
          </p>
          {(preMarketPrice || postMarketPrice) && (
            <p className="text-[10px] text-muted-foreground mt-1 font-mono">
              {preMarketPrice ? `Pre: ${currencySymbol}${preMarketPrice.toFixed(2)}` : ""}
              {postMarketPrice ? `Post: ${currencySymbol}${postMarketPrice.toFixed(2)}` : ""}
            </p>
          )}
        </>
      )}
    </button>
  );
};

export default StockCard;
