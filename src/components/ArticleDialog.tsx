import { useState, useEffect } from "react";
import { X, ExternalLink, Loader2, FileText } from "lucide-react";

interface Article {
  title: string;
  description?: string;
  content?: string;
  url: string;
  urlToImage?: string;
  publishedAt?: string;
  author?: string;
  source?: { name: string };
  _query?: string;
}

interface Props {
  article: Article | null;
  onClose: () => void;
}

const ArticleDialog = ({ article, onClose }: Props) => {
  const [fullText, setFullText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oaUrl, setOaUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!article?.url) return;
    setFullText(null);
    setOaUrl(null);
    setLoading(true);

    // Try Unpaywall for open-access version
    const doi = extractDOI(article.url);
    if (doi) {
      fetch(`https://api.unpaywall.org/v2/${doi}?email=fintrack@example.com`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.best_oa_location?.url_for_pdf) {
            setOaUrl(data.best_oa_location.url_for_pdf);
          } else if (data?.best_oa_location?.url) {
            setOaUrl(data.best_oa_location.url);
          }
        })
        .catch(() => {});
    }

    setLoading(false);
  }, [article?.url]);

  if (!article) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center gap-2 z-10">
          <span className="text-xs font-medium text-muted-foreground flex-1">{article.source?.name}</span>
          <div className="flex items-center gap-1.5">
            {oaUrl && (
              <a
                href={oaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-stock-up/10 text-stock-up hover:bg-stock-up/20 transition-colors"
              >
                <FileText className="h-3 w-3" />Open Access
              </a>
            )}
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />Open
            </a>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Image */}
        {article.urlToImage && (
          <img
            src={article.urlToImage}
            alt=""
            className="w-full h-52 object-cover"
            onError={e => (e.currentTarget.style.display = "none")}
          />
        )}

        {/* Body */}
        <div className="p-5 space-y-3">
          <h2 className="text-xl font-bold text-foreground leading-tight">{article.title}</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            {article.author && <span>By {article.author}</span>}
            {article.publishedAt && (
              <>
                <span>·</span>
                <span>{new Date(article.publishedAt).toLocaleString()}</span>
              </>
            )}
          </div>
          {article._query && (
            <p className="text-[10px] text-primary/70 flex items-center gap-1">
              AI search: "{article._query}"
            </p>
          )}
          {article.description && (
            <p className="text-sm text-foreground leading-relaxed">{article.description}</p>
          )}
          {article.content && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {article.content.replace(/\[\+\d+ chars\]/, "")}
            </p>
          )}
          <div className="pt-3 border-t border-border flex items-center gap-3">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Read full article <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {oaUrl && (
              <a
                href={oaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-stock-up hover:underline"
              >
                <FileText className="h-3.5 w-3.5" />Open Access Version
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function extractDOI(url: string): string | null {
  const match = url.match(/10\.\d{4,9}\/[^\s&]+/);
  return match ? match[0] : null;
}

export default ArticleDialog;
