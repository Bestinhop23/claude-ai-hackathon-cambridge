import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSymbolSearch } from "@/hooks/useStockData";
import { useNavigate } from "react-router-dom";

const StockSearch = () => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useSymbolSearch(query);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const results = (data || []).slice(0, 8);

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search stocks, indices, ETFs..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query.length >= 2 && setOpen(true)}
          className="pl-10 pr-10 bg-secondary/50 border-border/50 h-11"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No results found</div>
          ) : (
            results.map((item: any) => (
              <button
                key={`${item.symbol}-${item.exchange}`}
                onClick={() => {
                  navigate(`/stock/${item.symbol}`);
                  setQuery("");
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
              >
                <div>
                  <span className="font-semibold text-foreground text-sm">{item.symbol}</span>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {item.shortname || item.longname}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">{item.exchDisp}</span>
                  <p className="text-xs text-muted-foreground capitalize">{item.quoteType}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default StockSearch;
