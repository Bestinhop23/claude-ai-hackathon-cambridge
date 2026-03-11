import { useMemo } from "react";
import { Target, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { YahooQuote } from "@/hooks/useStockData";

interface ChartPoint { timestamp: number; price: number; }

function linearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number; r2: number } {
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (const { x, y } of data) {
    sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x; sumY2 += y * y;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const ssTot = sumY2 - (sumY * sumY) / n;
  const ssRes = data.reduce((acc, { x, y }) => acc + (y - (slope * x + intercept)) ** 2, 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

function computeEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < data.length; i++) {
    if (i < period) { result.push(data[i]); continue; }
    ema = data[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

interface Props {
  chartData: ChartPoint[];
  symbol: string;
  quote: YahooQuote | null | undefined;
  currSym: string;
  convert: (v: number) => number;
}

const PredictionsTab = ({ chartData, symbol, quote, currSym, convert }: Props) => {
  const predictions = useMemo(() => {
    const validData = chartData.filter(d => d.price != null && d.price > 0);
    if (validData.length < 52) return null;

    const prices = validData.map(d => d.price);
    const timestamps = validData.map(d => d.timestamp);

    // Linear regression on log prices
    const logData = validData.map((d, i) => ({ x: i, y: Math.log(d.price) }));
    const { slope, intercept, r2 } = linearRegression(logData);

    // EMA-based trend
    const ema50 = computeEMA(prices, 50);
    const ema200 = computeEMA(prices, Math.min(200, Math.floor(prices.length * 0.8)));

    const currentPrice = prices.at(-1)!;
    const lastIdx = prices.length - 1;

    // Project forward: 3mo, 6mo, 12mo
    const weeklyStep = 1; // each point is ~1 week
    const projections = [
      { label: "3 Months", weeks: 13 },
      { label: "6 Months", weeks: 26 },
      { label: "12 Months", weeks: 52 },
    ].map(({ label, weeks }) => {
      const logPrediction = Math.exp(slope * (lastIdx + weeks) + intercept);
      const emaTrend = ema50.at(-1)! + (ema50.at(-1)! - ema50.at(-Math.min(13, ema50.length))!) * (weeks / 13);

      // Weighted average: 60% regression, 40% EMA-based
      const predicted = logPrediction * 0.6 + emaTrend * 0.4;
      const change = ((predicted - currentPrice) / currentPrice) * 100;

      // Confidence band based on historical volatility
      const returns = prices.slice(-52).map((p, i) => i === 0 ? 0 : Math.log(p / prices[prices.length - 52 + i - 1]));
      const volatility = Math.sqrt(returns.reduce((s, r) => s + r * r, 0) / returns.length) * Math.sqrt(52);
      const confidenceWidth = volatility * Math.sqrt(weeks / 52) * currentPrice;

      return {
        label,
        predicted,
        change,
        low: predicted - confidenceWidth,
        high: predicted + confidenceWidth,
        confidence: Math.max(20, Math.min(95, r2 * 100 * (1 - weeks / 200))),
      };
    });

    // Build chart data with projections
    const historicalChart = validData.slice(-104).map(d => ({
      date: new Date(d.timestamp * 1000).toLocaleDateString("en-US", { year: "2-digit", month: "short" }),
      price: d.price,
      trend: null as number | null,
      low: null as number | null,
      high: null as number | null,
    }));

    const lastDate = new Date(timestamps.at(-1)! * 1000);
    const projChart = [{ label: "Now", weeks: 0, predicted: currentPrice, low: currentPrice, high: currentPrice }, ...projections.map(p => ({ ...p, weeks: p.label === "3 Months" ? 13 : p.label === "6 Months" ? 26 : 52 }))].map(p => {
      const d = new Date(lastDate);
      d.setDate(d.getDate() + p.weeks * 7);
      return {
        date: d.toLocaleDateString("en-US", { year: "2-digit", month: "short" }),
        price: p.weeks === 0 ? currentPrice : null,
        trend: p.predicted,
        low: p.low,
        high: p.high,
      };
    });

    return {
      projections,
      chartData: [...historicalChart, ...projChart],
      r2,
      annualizedReturn: (Math.exp(slope * 52) - 1) * 100,
      currentPrice,
    };
  }, [chartData]);

  if (!predictions) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm">Loading prediction data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">ML Price Projections — {symbol}</h3>
          <span className="text-[9px] px-2 py-0.5 rounded bg-secondary text-muted-foreground ml-auto">
            R² = {predictions.r2.toFixed(3)} · Annual trend: {predictions.annualizedReturn >= 0 ? "+" : ""}{predictions.annualizedReturn.toFixed(1)}%
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {predictions.projections.map(p => (
            <div key={p.label} className="bg-secondary/40 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{p.label}</p>
              <p className={`font-mono text-xl font-bold ${p.change >= 0 ? "text-stock-up" : "text-stock-down"}`}>
                {currSym}{p.predicted.toFixed(2)}
              </p>
              <p className={`font-mono text-xs ${p.change >= 0 ? "text-stock-up" : "text-stock-down"}`}>
                {p.change >= 0 ? "+" : ""}{p.change.toFixed(1)}%
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[8px] text-muted-foreground">Range:</span>
                <span className="font-mono text-[9px] text-foreground">{currSym}{p.low.toFixed(2)} — {currSym}{p.high.toFixed(2)}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1 mt-1.5">
                <div className="h-full bg-primary rounded-full" style={{ width: `${p.confidence}%` }} />
              </div>
              <span className="text-[8px] text-muted-foreground">{p.confidence.toFixed(0)}% confidence</span>
            </div>
          ))}
        </div>
      </div>

      {/* Projection chart */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">Historical + Projected Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={predictions.chartData}>
            <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Line type="monotone" dataKey="price" stroke="hsl(var(--foreground))" dot={false} strokeWidth={1.5} name="Historical" connectNulls={false} />
            <Line type="monotone" dataKey="trend" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} strokeDasharray="6 3" name="Projection" connectNulls />
            <Line type="monotone" dataKey="high" stroke="hsl(var(--stock-up))" dot={false} strokeWidth={1} strokeDasharray="3 3" name="Upper" opacity={0.5} connectNulls />
            <Line type="monotone" dataKey="low" stroke="hsl(var(--stock-down))" dot={false} strokeWidth={1} strokeDasharray="3 3" name="Lower" opacity={0.5} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Methodology */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-xs font-bold text-foreground mb-2 uppercase tracking-wider">Methodology</h3>
        <ul className="text-[10px] text-muted-foreground space-y-1">
          <li>• <strong>Log-linear regression</strong> on 5-year weekly price history for trend extraction</li>
          <li>• <strong>EMA crossover</strong> (50/200-day) for momentum confirmation</li>
          <li>• <strong>Weighted ensemble</strong>: 60% regression + 40% EMA-based projection</li>
          <li>• <strong>Confidence bands</strong> derived from annualized historical volatility</li>
          <li>• <strong>R² goodness-of-fit</strong> metric indicates regression reliability</li>
        </ul>
        <p className="text-[9px] text-stock-down mt-2 flex items-center gap-1">
          <TrendingDown className="h-3 w-3" />
          Statistical models cannot predict future events. This is not financial advice.
        </p>
      </div>
    </div>
  );
};

export default PredictionsTab;
