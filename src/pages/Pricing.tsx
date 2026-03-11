import { Activity, Check, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TIERS, type TierKey } from "@/lib/subscription-tiers";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

const Pricing = () => {
  const navigate = useNavigate();
  const { user, tier: currentTier } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleCheckout = async (tierKey: TierKey) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const t = TIERS[tierKey];
    if (!t.price_id) return;

    setLoadingTier(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { price_id: t.price_id },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingTier(null);
    }
  };

  const handleManage = async () => {
    setLoadingTier("manage");
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingTier(null);
    }
  };

  const tierEntries: { key: TierKey; highlight: boolean }[] = [
    { key: "basic", highlight: false },
    { key: "premium", highlight: true },
    { key: "unlimited", highlight: false },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-foreground">FinTrack</span>
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">Choose Your Plan</h1>
          <p className="text-muted-foreground">Unlock advanced market intelligence</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {tierEntries.map(({ key, highlight }) => {
            const t = TIERS[key];
            const isCurrent = currentTier === key;
            return (
              <div key={key} className={`bg-card border rounded-xl p-6 flex flex-col ${highlight ? "border-primary ring-2 ring-primary/20" : "border-border"}`}>
                {highlight && <span className="text-[10px] uppercase tracking-wider text-primary font-bold mb-2">Most Popular</span>}
                <h3 className="text-xl font-bold text-foreground">{t.name}</h3>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {t.price === 0 ? "Free" : `$${t.price}`}
                  {t.price > 0 && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                </p>
                <ul className="mt-4 space-y-2 flex-1">
                  {t.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled={!user || key === "basic"} onClick={handleManage}>
                      {loadingTier === "manage" ? <Loader2 className="h-4 w-4 animate-spin" /> : key === "basic" ? "Current Plan" : "Manage Subscription"}
                    </Button>
                  ) : (
                    <Button className="w-full" variant={highlight ? "default" : "outline"} onClick={() => key === "basic" ? navigate("/") : handleCheckout(key)} disabled={loadingTier === key}>
                      {loadingTier === key ? <Loader2 className="h-4 w-4 animate-spin" /> : key === "basic" ? "Get Started" : `Upgrade to ${t.name}`}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Pricing;
