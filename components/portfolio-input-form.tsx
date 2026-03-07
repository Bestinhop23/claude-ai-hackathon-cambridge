"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const demoInput = "AAPL 30%\nMSFT 20%\nQQQ 50%";

export function PortfolioInputForm({ initialValue = demoInput }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);
  const router = useRouter();

  return (
    <div className="space-y-4">
      <Textarea value={value} onChange={(event) => setValue(event.target.value)} aria-label="Portfolio holdings" />
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => router.push(`/portfolio?holdings=${encodeURIComponent(value)}`)}>Analyze portfolio</Button>
        <Button variant="secondary" onClick={() => setValue(demoInput)}>
          Load demo
        </Button>
      </div>
    </div>
  );
}
