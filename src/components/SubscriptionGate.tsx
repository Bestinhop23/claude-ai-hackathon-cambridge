import { Lock, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { hasAccess, type TierKey } from "@/lib/subscription-tiers";
import { Button } from "@/components/ui/button";

interface Props {
  requiredTier: TierKey;
  featureName: string;
  children: React.ReactNode;
}

const SubscriptionGate = ({ requiredTier, featureName, children }: Props) => {
  const { user, tier } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Sign in to access {featureName}</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Create a free account to unlock this feature, or upgrade for full access.
        </p>
        <Button onClick={() => navigate("/auth")}>Sign In</Button>
      </div>
    );
  }

  if (!hasAccess(tier, requiredTier)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Crown className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">{featureName} requires {requiredTier === "premium" ? "Premium" : "Unlimited"}</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Upgrade your plan to unlock {featureName.toLowerCase()} and other advanced features.
        </p>
        <Button onClick={() => navigate("/pricing")} className="gap-2">
          <Crown className="h-4 w-4" />
          Upgrade to {requiredTier === "premium" ? "Premium" : "Unlimited"}
        </Button>
      </div>
    );
  }

  return <>{children}</>;
};

export default SubscriptionGate;
