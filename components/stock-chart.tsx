"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function StockChart({
  data,
  ranges,
  activeRange,
  onRangeChange,
}: {
  data: Array<{ date: string; value: number }>;
  ranges: string[];
  activeRange: string;
  onRangeChange?: (range: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ranges.map((range) => (
          <button
            key={range}
            type="button"
            onClick={() => onRangeChange?.(range)}
            className={`rounded-full px-3 py-1.5 text-xs ${activeRange === range ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] bg-white/60"}`}
          >
            {range}
          </button>
        ))}
      </div>
      <div className="h-[320px] min-h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5, 10)} tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#143b2d" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
