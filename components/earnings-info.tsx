"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EarningsInfo({
  earnings,
}: {
  earnings: Array<{ period: string; actual: number; estimate: number }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Earnings History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] min-h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={earnings}>
              <CartesianGrid vertical={false} stroke="rgba(17,32,24,0.08)" />
              <XAxis dataKey="period" tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="estimate" fill="#d5c0a4" radius={[8, 8, 0, 0]} />
              <Bar dataKey="actual" fill="#143b2d" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
