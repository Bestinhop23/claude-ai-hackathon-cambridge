import { Activity } from "lucide-react";

interface Props {
  message?: string;
  submessage?: string;
}

const LoadingPulse = ({ message = "Loading data…", submessage }: Props) => (
  <div className="flex flex-col items-center justify-center py-20 gap-5">
    <div className="relative">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
        <Activity className="h-7 w-7 text-primary" />
      </div>
      <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-ping" style={{ animationDuration: "1.5s" }} />
    </div>
    <div className="text-center space-y-1">
      <p className="text-sm font-medium text-foreground">{message}</p>
      {submessage && <p className="text-xs text-muted-foreground">{submessage}</p>}
    </div>
    <div className="flex gap-1">
      {[0, 1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary/60"
          style={{
            animation: "pulse 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  </div>
);

export default LoadingPulse;
