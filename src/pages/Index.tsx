import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, BarChart3, Briefcase, Newspaper, LogIn, LogOut, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import CurrencySelector from "@/components/CurrencySelector";
import StockSearch from "@/components/StockSearch";
import MarketOverview from "@/components/MarketOverview";
import PortfolioTab from "@/components/PortfolioTab";
import RiskDisclaimer from "@/components/RiskDisclaimer";

const UserMenu = () => {
  const { user, tier, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) {
    return (
      <button onClick={() => navigate("/auth")} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <LogIn className="h-4 w-4" />Sign In
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      {tier !== "basic" && (
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
          <Crown className="h-3 w-3" />{tier}
        </span>
      )}
      <button onClick={() => navigate("/pricing")} className="text-xs text-muted-foreground hover:text-foreground">
        {tier === "basic" ? "Upgrade" : "Plans"}
      </button>
      <button onClick={signOut} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
};

const Index = () => {
  const [tab, setTab] = useState<"data" | "portfolio">("data");
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          <div className="mr-4 flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold tracking-tight text-foreground">FinTrack</span>
          </div>
          <StockSearch />

          <div className="ml-4 flex items-center gap-1 rounded-lg bg-muted p-1">
            {[
              { key: "data" as const, label: "Data", icon: BarChart3 },
              { key: "portfolio" as const, label: "My Portfolio", icon: Briefcase },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                  tab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}>
                <t.icon className="h-4 w-4" />{t.label}
              </button>
            ))}
            <button
              onClick={() => navigate("/news")}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
            >
              <Newspaper className="h-4 w-4" />News
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <CurrencySelector />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <RiskDisclaimer />

      <main className="container mx-auto px-4 py-4">
        {tab === "data" && <MarketOverview />}
        {tab === "portfolio" && <PortfolioTab />}
      </main>

      <footer className="mt-8 border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          <p>
            {tab === "data" ? "Market data provided by Yahoo Finance. Prices may be delayed." :
             "Portfolio tracking for personal use. Not financial advice."}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
