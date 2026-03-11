import { useMemo } from "react";
import { BarChart3, TrendingUp, TrendingDown, Zap, AlertTriangle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { YahooQuote } from "@/hooks/useStockData";

interface ChartPoint { timestamp: number; price: number; }

function computeSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    const slice = data.slice(i - period + 1, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

function computeEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let ema: number | null = null;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    if (ema === null) {
      ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    } else {
      ema = data[i] * k + ema * (1 - k);
    }
    result.push(ema);
  }
  return result;
}

function computeRSI(data: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period) { result.push(null); continue; }
    let gains = 0, losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = data[j] - data[j - 1];
      if (diff > 0) gains += diff; else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - 100 / (1 + rs));
  }
  return result;
}

function computeMACD(data: number[]): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const ema12 = computeEMA(data, 12);
  const ema26 = computeEMA(data, 26);
  const macdLine: (number | null)[] = data.map((_, i) => {
    if (ema12[i] == null || ema26[i] == null) return null;
    return ema12[i]! - ema26[i]!;
  });
  const macdValues = macdLine.filter(v => v !== null) as number[];
  const signalRaw = computeEMA(macdValues, 9);
  const signal: (number | null)[] = [];
  let idx = 0;
  for (const v of macdLine) {
    if (v === null) { signal.push(null); continue; }
    signal.push(signalRaw[idx] ?? null);
    idx++;
  }
  const histogram = macdLine.map((v, i) => v != null && signal[i] != null ? v - signal[i]! : null);
  return { macd: macdLine, signal, histogram };
}

function getVolumeSignal(quote?: YahooQuote | null): { signal: string; description: string; strength: string } {
  if (!quote?.regularMarketVolume || !quote?.averageDailyVolume3Month) {
    return { signal: "NEUTRAL", description: "Insufficient volume data", strength: "WEAK" };
  }
  const ratio = quote.regularMarketVolume / quote.averageDailyVolume3Month;
  const priceUp = (quote.regularMarketChangePercent ?? 0) > 0;
  if (ratio > 2) {
    return {
      signal: priceUp ? "STRONG BUY" : "STRONG SELL",
      description: `Volume is ${ratio.toFixed(1)}x the 3-month average — ${priceUp ? "institutional accumulation" : "heavy distribution"} likely`,
      strength: "STRONG",
    };
  }
  if (ratio > 1.5) {
    return {
      signal: priceUp ? "BUY" : "SELL",
      description: `Above-average volume (${ratio.toFixed(1)}x) ${priceUp ? "supports upward momentum" : "confirms selling pressure"}`,
      strength: "MODERATE",
    };
  }
  if (ratio < 0.5) {
    return {
      signal: "CAUTION",
      description: "Unusually low volume — price moves may lack conviction",
      strength: "WEAK",
    };
  }
  return { signal: "NEUTRAL", description: `Normal volume levels (${ratio.toFixed(1)}x average)`, strength: "MODERATE" };
}

interface Props {
  chartData: ChartPoint[];
  quote: YahooQuote | null | undefined;
  metrics: Record<string, any>;
  currSym: string;
}

const SignalsTab = ({ chartData, quote, metrics, currSym }: Props) => {
  const prices = useMemo(() => chartData.filter(d => d.price != null).map(d => d.price), [chartData]);

  const sma20 = useMemo(() => computeSMA(prices, 20), [prices]);
  const sma50 = useMemo(() => computeSMA(prices, 50), [prices]);
  const rsi = useMemo(() => computeRSI(prices), [prices]);
  const { macd, signal: macdSignal, histogram } = useMemo(() => computeMACD(prices), [prices]);
  const volumeSignal = useMemo(() => getVolumeSignal(quote), [quote]);

  const currentRSI = rsi.filter(v => v != null).at(-1);
  const currentMACD = macd.filter(v => v != null).at(-1);
  const currentSignal = macdSignal.filter(v => v != null).at(-1);
  const currentPrice = prices.at(-1);
  const currentSMA20 = sma20.filter(v => v != null).at(-1);
  const currentSMA50 = sma50.filter(v => v != null).at(-1);

  // Signals summary
  const signals: { name: string; value: string; signal: "BUY" | "SELL" | "NEUTRAL"; note: string }[] = [];

  if (currentRSI != null) {
    signals.push({
      name: "RSI (14)",
      value: currentRSI.toFixed(1),
      signal: currentRSI < 30 ? "BUY" : currentRSI > 70 ? "SELL" : "NEUTRAL",
      note: currentRSI < 30 ? "Oversold — potential reversal up" : currentRSI > 70 ? "Overbought — potential pullback" : "Neutral territory",
    });
  }

  if (currentMACD != null && currentSignal != null) {
    const macdBullish = currentMACD > currentSignal;
    signals.push({
      name: "MACD",
      value: currentMACD.toFixed(3),
      signal: macdBullish ? "BUY" : "SELL",
      note: macdBullish ? "MACD above signal — bullish momentum" : "MACD below signal — bearish momentum",
    });
  }

  if (currentPrice != null && currentSMA20 != null) {
    signals.push({
      name: "Price vs SMA(20)",
      value: `${currSym}${currentSMA20.toFixed(2)}`,
      signal: currentPrice > currentSMA20 ? "BUY" : "SELL",
      note: currentPrice > currentSMA20 ? "Price above 20-day MA — short-term uptrend" : "Price below 20-day MA — short-term downtrend",
    });
  }

  if (currentPrice != null && currentSMA50 != null) {
    signals.push({
      name: "Price vs SMA(50)",
      value: `${currSym}${currentSMA50.toFixed(2)}`,
      signal: currentPrice > currentSMA50 ? "BUY" : "SELL",
      note: currentPrice > currentSMA50 ? "Price above 50-day MA — medium-term uptrend" : "Price below 50-day MA — medium-term downtrend",
    });
  }

  if (currentSMA20 != null && currentSMA50 != null) {
    const golden = currentSMA20 > currentSMA50;
    signals.push({
      name: "MA Cross",
      value: golden ? "Golden Cross" : "Death Cross",
      signal: golden ? "BUY" : "SELL",
      note: golden ? "20-day MA above 50-day MA — bullish crossover" : "20-day MA below 50-day MA — bearish crossover",
    });
  }

  signals.push({
    name: "Volume",
    value: volumeSignal.signal,
    signal: volumeSignal.signal.includes("BUY") ? "BUY" : volumeSignal.signal.includes("SELL") ? "SELL" : "NEUTRAL",
    note: volumeSignal.description,
  });

  const buyCount = signals.filter(s => s.signal === "BUY").length;
  const sellCount = signals.filter(s => s.signal === "SELL").length;
  const overallSignal = buyCount > sellCount ? "BULLISH" : sellCount > buyCount ? "BEARISH" : "NEUTRAL";

  const chartDataForMA = chartData.filter(d => d.price != null).map((d, i) => ({
    date: new Date(d.timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    price: d.price,
    sma20: sma20[i],
    sma50: sma50[i],
  }));

  const rsiChartData = chartData.filter(d => d.price != null).map((d, i) => ({
    date: new Date(d.timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    rsi: rsi[i],
  })).filter(d => d.rsi != null);

  const macdChartData = chartData.filter(d => d.price != null).map((d, i) => ({
    date: new Date(d.timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    macd: macd[i],
    signal: macdSignal[i],
    histogram: histogram[i],
  })).filter(d => d.macd != null);

  if (prices.length < 20) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <AlertTriangle className="h-8 w-8" />
        <p className="text-sm">Not enough data to compute trading signals</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Signal */}
      <div className={`bg-card border rounded-lg p-4 flex items-center gap-4 ${
        overallSignal === "BULLISH" ? "border-stock-up/30" : overallSignal === "BEARISH" ? "border-stock-down/30" : "border-border"
      }`}>
        <div className={`text-3xl font-bold font-mono ${
          overallSignal === "BULLISH" ? "text-stock-up" : overallSignal === "BEARISH" ? "text-stock-down" : "text-muted-foreground"
        }`}>
          {overallSignal}
        </div>
        <div className="text-xs text-muted-foreground">
          {buyCount} buy · {sellCount} sell · {signals.length - buyCount - sellCount} neutral signals
        </div>
      </div>

      {/* Signal cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {signals.map(s => (
          <div key={s.name} className="bg-card border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.name}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                s.signal === "BUY" ? "bg-stock-up/10 text-stock-up" : s.signal === "SELL" ? "bg-stock-down/10 text-stock-down" : "bg-secondary text-muted-foreground"
              }`}>{s.signal}</span>
            </div>
            <p className="font-mono text-sm font-bold text-foreground">{s.value}</p>
            <p className="text-[9px] text-muted-foreground mt-1">{s.note}</p>
          </div>
        ))}
      </div>

      {/* Price + MA chart */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">Price & Moving Averages (6M)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartDataForMA}>
            <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Line type="monotone" dataKey="price" stroke="hsl(var(--foreground))" dot={false} strokeWidth={1.5} name="Price" />
            <Line type="monotone" dataKey="sma20" stroke="hsl(var(--primary))" dot={false} strokeWidth={1} strokeDasharray="4 2" name="SMA(20)" />
            <Line type="monotone" dataKey="sma50" stroke="hsl(var(--stock-up))" dot={false} strokeWidth={1} strokeDasharray="4 2" name="SMA(50)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* RSI chart */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">RSI (14)</h3>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={rsiChartData}>
            <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <ReferenceLine y={70} stroke="hsl(var(--stock-down))" strokeDasharray="3 3" />
            <ReferenceLine y={30} stroke="hsl(var(--stock-up))" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="rsi" stroke="hsl(var(--primary))" dot={false} strokeWidth={1.5} name="RSI" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* MACD chart */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">MACD</h3>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={macdChartData}>
            <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Bar dataKey="histogram" fill="hsl(var(--primary))" opacity={0.4} name="Histogram" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SignalsTab;
