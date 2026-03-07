import { useCompanyProfile, useEarnings } from "@/hooks/useStockData";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2, Globe, Users, Calendar, MapPin, Phone, ExternalLink,
  BarChart3, TrendingUp, TrendingDown, DollarSign, Briefcase, Shield, Activity,
} from "lucide-react";

interface CompanyProfileProps {
  symbol: string;
}

const CompanyProfile = ({ symbol }: CompanyProfileProps) => {
  const { data, isLoading } = useCompanyProfile(symbol);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  const profile = data?.profile;
  const metrics = data?.metrics || {};
  const recommendations = data?.recommendations || [];
  const peers = data?.peers || [];

  const valuationMetrics = [
    { label: "P/E (TTM)", value: metrics["peBasicExclExtraTTM"]?.toFixed(2) },
    { label: "Forward P/E", value: metrics["peExclExtraAnnual"]?.toFixed(2) },
    { label: "P/B", value: metrics["pbAnnual"]?.toFixed(2) },
    { label: "P/S (TTM)", value: metrics["psTTM"]?.toFixed(2) },
    { label: "EV/EBITDA", value: metrics["enterpriseValueOverEBITDATTM"]?.toFixed(2) },
    { label: "EV/Revenue", value: metrics["enterpriseValueOverRevenueTTM"]?.toFixed(2) },
    { label: "Price/CF", value: metrics["pfcfShareTTM"]?.toFixed(2) },
    { label: "PEG Ratio", value: metrics["pegAnnual"]?.toFixed(2) },
  ];

  const financialMetrics = [
    { label: "Revenue/Share (TTM)", value: metrics["revenuePerShareTTM"]?.toFixed(2) },
    { label: "Net Income/Share", value: metrics["netIncomePerShareTTM"]?.toFixed(2) },
    { label: "Book Value/Share", value: metrics["bookValuePerShareQuarterly"]?.toFixed(2) },
    { label: "Cash/Share", value: metrics["cashPerSharePerShareQuarterly"]?.toFixed(2) },
    { label: "Tangible BV/Share", value: metrics["tangibleBookValuePerShareQuarterly"]?.toFixed(2) },
    { label: "Current Ratio", value: metrics["currentRatioQuarterly"]?.toFixed(2) },
    { label: "Quick Ratio", value: metrics["quickRatioQuarterly"]?.toFixed(2) },
    { label: "Debt/Equity", value: metrics["totalDebtToEquityQuarterly"]?.toFixed(2) },
    { label: "LT Debt/Equity", value: metrics["longTermDebtToEquityQuarterly"]?.toFixed(2) },
    { label: "Debt/Assets", value: metrics["totalDebtToTotalAssetsQuarterly"]?.toFixed(2) },
    { label: "Interest Coverage", value: metrics["interestCoverageQuarterly"]?.toFixed(2) },
  ];

  const profitabilityMetrics = [
    { label: "ROE (TTM)", value: metrics["roeTTM"] ? `${metrics["roeTTM"].toFixed(2)}%` : undefined },
    { label: "ROA (TTM)", value: metrics["roaTTM"] ? `${metrics["roaTTM"].toFixed(2)}%` : undefined },
    { label: "ROIC (TTM)", value: metrics["roicTTM"] ? `${metrics["roicTTM"].toFixed(2)}%` : undefined },
    { label: "Gross Margin", value: metrics["grossMarginTTM"] ? `${metrics["grossMarginTTM"].toFixed(2)}%` : undefined },
    { label: "Operating Margin", value: metrics["operatingMarginTTM"] ? `${metrics["operatingMarginTTM"].toFixed(2)}%` : undefined },
    { label: "Net Margin", value: metrics["netProfitMarginTTM"] ? `${metrics["netProfitMarginTTM"].toFixed(2)}%` : undefined },
    { label: "EBITDA Margin", value: metrics["ebitdaMarginTTM"] ? `${metrics["ebitdaMarginTTM"].toFixed(2)}%` : undefined },
    { label: "FCF Margin", value: metrics["fcfMarginTTM"] ? `${metrics["fcfMarginTTM"].toFixed(2)}%` : undefined },
  ];

  const growthMetrics = [
    { label: "Rev Growth (QoQ)", value: metrics["revenueGrowthQuarterlyYoy"] ? `${metrics["revenueGrowthQuarterlyYoy"].toFixed(2)}%` : undefined },
    { label: "Rev Growth (TTM)", value: metrics["revenueGrowthTTMYoy"] ? `${metrics["revenueGrowthTTMYoy"].toFixed(2)}%` : undefined },
    { label: "Rev Growth (3Y)", value: metrics["revenueGrowth3Y"] ? `${metrics["revenueGrowth3Y"].toFixed(2)}%` : undefined },
    { label: "Rev Growth (5Y)", value: metrics["revenueGrowth5Y"] ? `${metrics["revenueGrowth5Y"].toFixed(2)}%` : undefined },
    { label: "EPS Growth (TTM)", value: metrics["epsGrowthTTMYoy"] ? `${metrics["epsGrowthTTMYoy"].toFixed(2)}%` : undefined },
    { label: "EPS Growth (3Y)", value: metrics["epsGrowth3Y"] ? `${metrics["epsGrowth3Y"].toFixed(2)}%` : undefined },
    { label: "EPS Growth (5Y)", value: metrics["epsGrowth5Y"] ? `${metrics["epsGrowth5Y"].toFixed(2)}%` : undefined },
    { label: "EBITDA CAGR (5Y)", value: metrics["ebitdaCagr5Y"] ? `${metrics["ebitdaCagr5Y"].toFixed(2)}%` : undefined },
  ];

  const technicalMetrics = [
    { label: "Beta", value: metrics["beta"]?.toFixed(3) },
    { label: "52W High", value: metrics["52WeekHigh"]?.toFixed(2) },
    { label: "52W Low", value: metrics["52WeekLow"]?.toFixed(2) },
    { label: "52W Return", value: metrics["52WeekPriceReturnDaily"] ? `${metrics["52WeekPriceReturnDaily"].toFixed(2)}%` : undefined },
    { label: "10D Avg Vol", value: metrics["10DayAverageTradingVolume"] ? `${(metrics["10DayAverageTradingVolume"] / 1e6).toFixed(2)}M` : undefined },
    { label: "3M Avg Vol", value: metrics["3MonthAverageTradingVolume"] ? `${(metrics["3MonthAverageTradingVolume"] / 1e6).toFixed(2)}M` : undefined },
    { label: "50D MA", value: metrics["50DayMovingAverage"]?.toFixed(2) },
    { label: "200D MA", value: metrics["200DayMovingAverage"]?.toFixed(2) },
  ];

  const dividendMetrics = [
    { label: "Div Yield (Indicated)", value: metrics["dividendYieldIndicatedAnnual"] ? `${(metrics["dividendYieldIndicatedAnnual"]).toFixed(2)}%` : undefined },
    { label: "Div/Share (Annual)", value: metrics["dividendPerShareAnnual"]?.toFixed(2) },
    { label: "Div Growth (5Y)", value: metrics["dividendGrowthRate5Y"] ? `${metrics["dividendGrowthRate5Y"].toFixed(2)}%` : undefined },
    { label: "Payout Ratio", value: metrics["payoutRatioAnnual"] ? `${metrics["payoutRatioAnnual"].toFixed(2)}%` : undefined },
    { label: "Buyback Yield", value: metrics["buyBackYieldAnnual"] ? `${metrics["buyBackYieldAnnual"].toFixed(2)}%` : undefined },
    { label: "Total Return Yield", value: metrics["totalReturnYieldAnnual"] ? `${metrics["totalReturnYieldAnnual"].toFixed(2)}%` : undefined },
  ];

  const MetricsGrid = ({ title, icon: Icon, items }: { title: string; icon: any; items: { label: string; value?: string }[] }) => {
    const validItems = items.filter(i => i.value);
    if (validItems.length === 0) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
          <Icon className="h-3.5 w-3.5 text-primary" />
          {title}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {validItems.map(item => (
            <div key={item.label}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
              <p className="font-mono text-sm font-medium text-foreground">{item.value ?? "—"}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const latestRec = recommendations[0];

  return (
    <div className="space-y-4">
      {/* Company Info */}
      {profile && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-start gap-4 mb-4">
            {profile.logo && (
              <img src={profile.logo} alt={profile.name} className="w-12 h-12 rounded-lg object-contain bg-secondary" />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">{profile.name}</h3>
              <div className="flex flex-wrap gap-2 mt-1">
                {profile.finnhubIndustry && (
                  <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">{profile.finnhubIndustry}</span>
                )}
                {profile.country && (
                  <span className="text-xs px-2 py-0.5 bg-secondary text-muted-foreground rounded flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{profile.country}
                  </span>
                )}
                {profile.ipo && (
                  <span className="text-xs px-2 py-0.5 bg-secondary text-muted-foreground rounded flex items-center gap-1">
                    <Calendar className="h-3 w-3" />IPO: {profile.ipo}
                  </span>
                )}
              </div>
            </div>
            {profile.marketCapitalization && (
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Market Cap</p>
                <p className="font-mono text-sm font-semibold text-foreground">
                  ${(profile.marketCapitalization / 1000).toFixed(1)}B
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {profile.exchange && (
              <div><span className="text-[10px] text-muted-foreground uppercase">Exchange</span><p className="font-medium text-foreground">{profile.exchange}</p></div>
            )}
            {profile.shareOutstanding && (
              <div><span className="text-[10px] text-muted-foreground uppercase">Shares Out</span><p className="font-mono font-medium text-foreground">{(profile.shareOutstanding).toFixed(1)}M</p></div>
            )}
            {profile.phone && (
              <div className="flex items-start gap-1"><Phone className="h-3 w-3 mt-0.5 text-muted-foreground" /><span className="text-xs text-foreground">{profile.phone}</span></div>
            )}
            {profile.weburl && (
              <a href={profile.weburl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Globe className="h-3 w-3" />Website
              </a>
            )}
          </div>
        </div>
      )}

      {/* Analyst Recommendations */}
      {latestRec && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
            <Users className="h-3.5 w-3.5 text-primary" />
            Analyst Consensus ({latestRec.period})
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: "Strong Buy", value: latestRec.strongBuy, color: "bg-emerald-500" },
              { label: "Buy", value: latestRec.buy, color: "bg-green-400" },
              { label: "Hold", value: latestRec.hold, color: "bg-yellow-400" },
              { label: "Sell", value: latestRec.sell, color: "bg-orange-400" },
              { label: "Strong Sell", value: latestRec.strongSell, color: "bg-red-500" },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div className={`${item.color} text-white rounded-lg py-2 mb-1`}>
                  <span className="font-mono font-bold text-lg">{item.value || 0}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
          {/* Show multiple periods if available */}
          {recommendations.length > 1 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Historical Consensus</p>
              <div className="grid grid-cols-4 gap-2 text-[11px]">
                {recommendations.slice(1, 5).map((rec: any, i: number) => (
                  <div key={i} className="bg-secondary/50 rounded-md p-2 text-center">
                    <p className="text-muted-foreground text-[10px]">{rec.period}</p>
                    <p className="font-mono font-semibold text-foreground">
                      {rec.strongBuy + rec.buy}B / {rec.hold}H / {rec.sell + rec.strongSell}S
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Peers */}
      {peers.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wider">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            Peer Companies
          </h3>
          <div className="flex flex-wrap gap-2">
            {peers.filter((p: string) => p !== symbol).slice(0, 15).map((peer: string) => (
              <a key={peer} href={`/stock/${peer}`} className="px-3 py-1.5 bg-secondary rounded-md text-xs font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
                {peer}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* All Metrics */}
      <MetricsGrid title="Valuation" icon={BarChart3} items={valuationMetrics} />
      <MetricsGrid title="Financial Health & Balance Sheet" icon={Shield} items={financialMetrics} />
      <MetricsGrid title="Profitability & Margins" icon={DollarSign} items={profitabilityMetrics} />
      <MetricsGrid title="Growth" icon={TrendingUp} items={growthMetrics} />
      <MetricsGrid title="Dividends & Shareholder Returns" icon={Briefcase} items={dividendMetrics} />
      <MetricsGrid title="Technical Indicators" icon={Activity} items={technicalMetrics} />
    </div>
  );
};

export default CompanyProfile;
