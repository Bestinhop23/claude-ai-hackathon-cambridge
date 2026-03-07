"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils";

type StockCardProps = {
  symbol: string;
  shortName: string;
  price: number;
  changePercent: number;
};

export function StockCard({ symbol, shortName, price, changePercent }: StockCardProps) {
  const [displayPrice, setDisplayPrice] = useState(price);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const update = () => {
      const direction = Math.random() > 0.5 ? 1 : -1;
      const next = Number((displayPrice * (1 + direction * 0.0002)).toFixed(2));
      setDisplayPrice(next);
      setFlash(direction > 0 ? "up" : "down");
      const timer = window.setTimeout(() => setFlash(null), 420);
      return timer;
    };

    const timeout = window.setInterval(() => {
      const timer = update();
      window.setTimeout(() => window.clearTimeout(timer), 500);
    }, 1000 + Math.random() * 400);

    return () => window.clearInterval(timeout);
  }, [displayPrice]);

  const tone = useMemo(() => (changePercent >= 0 ? "text-emerald-700" : "text-rose-700"), [changePercent]);

  return (
    <Link href={`/stocks/${symbol}`}>
      <Card className={`transition ${flash === "up" ? "ring-2 ring-emerald-300" : flash === "down" ? "ring-2 ring-rose-300" : ""}`}>
        <CardContent className="pt-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{symbol}</p>
              <p className="text-sm text-[var(--muted)]">{shortName}</p>
            </div>
            <div className={`text-right ${tone}`}>
              <p className="text-lg font-semibold">${displayPrice.toFixed(2)}</p>
              <p className="text-sm">{formatPercent(changePercent)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
