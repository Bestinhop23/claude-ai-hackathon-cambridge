import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisResponse } from "@/lib/schemas/analysis";
import type { PortfolioResponse } from "@/lib/schemas/portfolio";

export function DataStatusPanel({
  status,
}: {
  status: AnalysisResponse["dataStatus"] | PortfolioResponse["dataStatus"];
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Data Status</CardTitle>
        <p className="text-sm text-[var(--muted)]">Trust layer for demos and user confidence.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {status.map((item) => (
          <div key={`${item.category}-${item.source}`} className="rounded-3xl border border-[var(--border)] bg-white/55 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{item.category}</p>
                <p className="text-sm text-[var(--muted)]">{item.source}</p>
              </div>
              <Badge
                variant={
                  item.status === "live" ? "success" : item.status === "mock" ? "warning" : item.status === "missing" ? "danger" : "neutral"
                }
              >
                {item.status}
              </Badge>
            </div>
            <p className="text-sm leading-6 text-[var(--muted)]">{item.notes}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
