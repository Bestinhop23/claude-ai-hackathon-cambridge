import { useState } from "react";

interface StockLogoProps {
  symbol: string;
  size?: number;
  className?: string;
}

const COLORS = [
  "hsl(217 91% 60%)",
  "hsl(152 69% 45%)",
  "hsl(0 84% 60%)",
  "hsl(280 70% 55%)",
  "hsl(35 90% 55%)",
  "hsl(190 80% 50%)",
  "hsl(340 75% 55%)",
  "hsl(120 50% 45%)",
];

function getColor(symbol: string) {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

const StockLogo = ({ symbol, size = 32, className = "" }: StockLogoProps) => {
  const [imgError, setImgError] = useState(false);
  const logoUrl = `https://assets.parqet.com/logos/symbol/${symbol}`;
  const color = getColor(symbol);

  if (imgError) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg font-bold text-white shrink-0 ${className}`}
        style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.4 }}
      >
        {symbol.charAt(0)}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={symbol}
      onError={() => setImgError(true)}
      className={`rounded-lg object-contain bg-secondary shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

export default StockLogo;
