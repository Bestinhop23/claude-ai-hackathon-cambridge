import { AlertTriangle } from "lucide-react";

const RiskDisclaimer = () => (
  <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 px-4 py-2 text-xs font-medium flex items-center gap-2 justify-center">
    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
    <span>Invest at your own risk. This is not financial advice. Always do your own research before making investment decisions.</span>
  </div>
);

export default RiskDisclaimer;
