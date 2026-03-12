import { Activity, Check, Loader2, PartyPopper, Settings } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TIERS, type TierKey } from "@/lib/subscription-tiers";
import { toast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const Pricing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, tier: currentTier, checkSubscription } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Handle successful checkout return
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setShowSuccess(true);
      // Poll subscription status until it updates
      const poll = async () => {
        for (let i = 0; i < 10; i++) {
          await checkSubscription();
          await new Promise(r => setTimeout(r, 2000));
        }
      };
      poll();
      // Clear the URL param
      window.history.replaceState({}, "", "/pricing");
    }
  }, [searchParams, checkSubscription]);

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
        {/* Success Banner */}
        {showSuccess && (
          <div className="max-w-md mx-auto mb-8 bg-stock-up/10 border border-stock-up/30 rounded-xl p-6 text-center">
            <PartyPopper className="h-10 w-10 text-stock-up mx-auto mb-3" />
            <h2 className="text-xl font-bold text-foreground mb-1">Welcome to {currentTier !== "basic" ? TIERS[currentTier].name : "your new plan"}!</h2>
            <p className="text-sm text-muted-foreground mb-4">Your subscription is now active. Enjoy all premium features.</p>
            <Button onClick={() => { setShowSuccess(false); navigate("/"); }} variant="outline" size="sm">
              Start Exploring →
            </Button>
          </div>
        )}

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">Choose Your Plan</h1>
          <p className="text-muted-foreground">Unlock advanced market intelligence</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {tierEntries.map(({ key, highlight }) => {
            const t = TIERS[key];
            const isCurrent = currentTier === key;
            return (
              <div key={key} className={`bg-card border rounded-xl p-6 flex flex-col ${
                isCurrent ? "border-primary ring-2 ring-primary/20" :
                highlight && !isCurrent ? "border-primary/50 ring-1 ring-primary/10" : "border-border"
              }`}>
                {isCurrent && <span className="text-[10px] uppercase tracking-wider text-primary font-bold mb-2 flex items-center gap-1"><Check className="h-3 w-3" />Your Plan</span>}
                {highlight && !isCurrent && <span className="text-[10px] uppercase tracking-wider text-primary font-bold mb-2">Most Popular</span>}
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
                    key === "basic" ? (
                      <Button variant="outline" className="w-full" disabled>Current Plan</Button>
                    ) : (
                      <Button variant="outline" className="w-full gap-2" onClick={handleManage} disabled={loadingTier === "manage"}>
                        {loadingTier === "manage" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                        Manage Subscription
                      </Button>
                    )
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
