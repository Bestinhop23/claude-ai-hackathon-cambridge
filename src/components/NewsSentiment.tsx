import { useState } from "react";
import { useNews, useRelevantNews, useSentiment } from "@/hooks/useStockData";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles, Zap, Search } from "lucide-react";
import ArticleDialog from "@/components/ArticleDialog";

interface NewsSentimentProps {
  symbol: string;
  companyName?: string;
}

const SentimentBadge = ({ sentiment }: { sentiment: string }) => {
  const config = {
    BULLISH: { icon: TrendingUp, bg: "bg-stock-up/10", text: "text-stock-up", border: "border-stock-up/30" },
    BEARISH: { icon: TrendingDown, bg: "bg-stock-down/10", text: "text-stock-down", border: "border-stock-down/30" },
    NEUTRAL: { icon: Minus, bg: "bg-muted", text: "text-muted-foreground", border: "border-border" },
  }[sentiment] || { icon: Minus, bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${config.bg} ${config.text} ${config.border}`}>
      <Icon className="h-4 w-4" /> {sentiment}
    </span>
  );
};

const ArticleCard = ({ article, onClick }: { article: any; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full text-left p-3 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-all group"
  >
    <div className="flex gap-3">
      {article.urlToImage && (
        <img
          src={article.urlToImage}
          alt=""
          className="w-16 h-16 rounded-md object-cover flex-shrink-0"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      )}
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {article.title}
        </h4>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
          {article.source?.name} · {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : ""}
        </p>
        {article._query && (
          <p className="text-[10px] text-primary/60 mt-0.5 flex items-center gap-1">
            <Search className="h-2.5 w-2.5" />
            {article._query}
          </p>
        )}
      </div>
    </div>
  </button>
);

const NewsSentiment = ({ symbol, companyName }: NewsSentimentProps) => {
  const { data: articles = [], isLoading: newsLoading } = useNews(symbol, companyName);
  const { data: relevantData, isLoading: relevantLoading } = useRelevantNews(symbol, companyName);
  const { data: sentimentData, isLoading: sentimentLoading } = useSentiment(symbol, articles);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  const relevantArticles = relevantData?.articles || [];
  const relevantQueries = relevantData?.queries || [];

  return (
    <div className="space-y-6">
      {/* Claude AI Sentiment Analysis */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="bg-[#D97757]/10 border-b border-[#D97757]/20 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#D97757] flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Claude AI Sentiment Analysis</h3>
            <p className="text-xs text-muted-foreground">Powered by Anthropic Claude</p>
          </div>
        </div>

        <div className="p-4">
          {newsLoading || sentimentLoading ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-[#D97757] border-t-transparent animate-spin" />
                <span className="text-sm text-muted-foreground italic">Claude is thinking...</span>
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : sentimentData ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <SentimentBadge sentiment={sentimentData.sentiment || "NEUTRAL"} />
                {sentimentData.confidence != null && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Confidence</span>
                    <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-[#D97757] rounded-full transition-all" style={{ width: `${sentimentData.confidence}%` }} />
                    </div>
                    <span className="text-xs font-mono font-medium text-foreground">{sentimentData.confidence}%</span>
                  </div>
                )}
                {sentimentData.risk && (
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                    sentimentData.risk === "HIGH" ? "bg-stock-down/10 text-stock-down" :
                    sentimentData.risk === "MEDIUM" ? "bg-amber-500/10 text-amber-500" :
                    "bg-stock-up/10 text-stock-up"
                  }`}>
                    <AlertTriangle className="h-3 w-3" />
                    {sentimentData.risk} Risk
                  </span>
                )}
              </div>

              {sentimentData.summary && (
                <p className="text-sm text-foreground leading-relaxed border-l-2 border-[#D97757]/40 pl-3">
                  {sentimentData.summary}
                </p>
              )}

              {sentimentData.factors?.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Key Factors</h4>
                  <ul className="space-y-1">
                    {sentimentData.factors.map((f: string, i: number) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-[#D97757] mt-1">•</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No sentiment analysis available.</p>
          )}
        </div>
      </div>

      {/* Relevant News Articles - AI-curated macro/insider news */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <Zap className="h-4 w-4 text-[#D97757]" />
          Relevant News Articles
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          AI-curated macro events, geopolitical risks & industry trends affecting {symbol}
        </p>

        {relevantLoading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-4 h-4 rounded-full border-2 border-[#D97757] border-t-transparent animate-spin" />
              <span className="text-xs text-muted-foreground italic">Claude is finding relevant macro events...</span>
            </div>
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : relevantArticles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No relevant macro news found.</p>
        ) : (
          <>
            {relevantQueries.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {relevantQueries.map((q: string, i: number) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/20">
                    {q}
                  </span>
                ))}
              </div>
            )}
            <div className="space-y-3">
              {relevantArticles.map((article: any, i: number) => (
                <ArticleCard key={i} article={article} onClick={() => setSelectedArticle(article)} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Latest News - Direct company news */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-primary" />
          Latest News ({articles.length})
        </h3>

        {newsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : articles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No news articles found for {symbol}</p>
        ) : (
          <div className="space-y-3">
            {articles.slice(0, 10).map((article: any, i: number) => (
              <ArticleCard key={i} article={article} onClick={() => setSelectedArticle(article)} />
            ))}
          </div>
        )}
      </div>

      <ArticleDialog article={selectedArticle} onClose={() => setSelectedArticle(null)} />
    </div>
  );
};

export default NewsSentiment;
