import { useState } from "react";
import { Activity, Newspaper, Loader2, TrendingUp, TrendingDown, BarChart3, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGlobalNews } from "@/hooks/useStockData";
import ThemeToggle from "@/components/ThemeToggle";
import CurrencySelector from "@/components/CurrencySelector";
import StockSearch from "@/components/StockSearch";
import StockLogo from "@/components/StockLogo";
import RiskDisclaimer from "@/components/RiskDisclaimer";
import ArticleDialog from "@/components/ArticleDialog";
import LoadingPulse from "@/components/LoadingPulse";

const News = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useGlobalNews();
  const articles = data?.articles || [];
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          <div className="mr-4 flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold tracking-tight text-foreground">FinTrack</span>
          </div>
          <StockSearch />

          <div className="ml-4 flex items-center gap-1 rounded-lg bg-muted p-1">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
            >
              <BarChart3 className="h-4 w-4" />Data
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
            >
              <Briefcase className="h-4 w-4" />My Portfolio
            </button>
            <button
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium bg-background text-foreground shadow-sm transition-all"
            >
              <Newspaper className="h-4 w-4" />News
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <CurrencySelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <RiskDisclaimer />

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex items-center gap-2 mb-6">
          <Newspaper className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Global Market News</h1>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </div>

        {articles.length > 0 ? (
          <div className="space-y-3">
            {articles.map((article: any, i: number) => (
              <div
                key={i}
                className="bg-card border border-border rounded-lg p-4 hover:bg-secondary/30 transition-colors cursor-pointer"
                onClick={() => setSelectedArticle(article)}
              >
                <div className="flex gap-4">
                  {article.urlToImage && (
                    <img
                      src={article.urlToImage}
                      alt=""
                      className="w-24 h-20 rounded-lg object-cover shrink-0"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-2 mb-1">
                      {article.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {article.description}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="font-medium">{article.source?.name}</span>
                      {article.publishedAt && (
                        <>
                          <span>·</span>
                          <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stock Impact Section */}
                {article.stockImpact?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Activity className="h-2.5 w-2.5" />
                      AI-Generated Stock Impact
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {article.stockImpact.map((stock: any, j: number) => (
                        <button
                          key={j}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/stock/${stock.symbol}`);
                          }}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-secondary/60 hover:bg-secondary transition-colors"
                        >
                          <StockLogo symbol={stock.symbol} size={16} />
                          <span className="font-mono text-[11px] font-bold text-foreground">
                            {stock.symbol}
                          </span>
                          {stock.impact === "POSITIVE" ? (
                            <TrendingUp className="h-3 w-3 text-stock-up" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-stock-down" />
                          )}
                          <span
                            className={`text-[9px] font-medium ${
                              stock.impact === "POSITIVE" ? "text-stock-up" : "text-stock-down"
                            }`}
                          >
                            {stock.reason}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : isLoading ? (
          <LoadingPulse message="Fetching global market news…" submessage="Analyzing headlines with AI" />
        ) : (
          <p className="text-sm text-muted-foreground text-center py-10">No news available</p>
        )}
      </main>

      <ArticleDialog article={selectedArticle} onClose={() => setSelectedArticle(null)} />
    </div>
  );
};

export default News;
