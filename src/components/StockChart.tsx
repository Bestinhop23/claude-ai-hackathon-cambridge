import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useChart, TIME_RANGES } from "@/hooks/useStockData";
import { Skeleton } from "@/components/ui/skeleton";

interface StockChartProps {
  symbol: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-semibold text-foreground">
        ${Number(payload[0].value).toFixed(2)}
      </p>
    </div>
  );
};

const StockChart = ({ symbol }: StockChartProps) => {
  const [rangeIdx, setRangeIdx] = useState(2); // default 1M
  const range = TIME_RANGES[rangeIdx];
  const { data, isLoading, error } = useChart(symbol, range.range, range.interval);

  const chartData = useMemo(() => {
    if (!data?.length) return [];
    return data
      .filter((p: any) => p.price != null)
      .map((p: any) => {
        const date = new Date(p.timestamp * 1000);
        let label: string;
        if (range.range === "1d") {
          label = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } else if (["5d", "1mo", "3mo"].includes(range.range)) {
          label = date.toLocaleDateString([], { month: "short", day: "numeric" });
        } else {
          label = date.toLocaleDateString([], { month: "short", year: "2-digit" });
        }
        return { date: label, price: p.price, fullDate: date.toLocaleString() };
      });
  }, [data, range.range]);

  const priceChange = useMemo(() => {
    if (chartData.length < 2) return 0;
    return chartData[chartData.length - 1].price - chartData[0].price;
  }, [chartData]);

  const isPositive = priceChange >= 0;
  const strokeColor = isPositive ? "hsl(var(--stock-up))" : "hsl(var(--stock-down))";
  const fillId = `chart-gradient-${symbol}`;

  if (error) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm">
        Failed to load chart data
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-1 mb-4">
        {TIME_RANGES.map((r, i) => (
          <button
            key={r.label}
            onClick={() => setRangeIdx(i)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              i === rangeIdx
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-[400px] w-full rounded-lg" />
      ) : chartData.length === 0 ? (
        <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm">
          No data available for this range
        </div>
      ) : (
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                domain={["auto", "auto"]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke={strokeColor}
                strokeWidth={2}
                fill={`url(#${fillId})`}
                dot={false}
                activeDot={{ r: 4, stroke: strokeColor, strokeWidth: 2, fill: "hsl(var(--background))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default StockChart;
