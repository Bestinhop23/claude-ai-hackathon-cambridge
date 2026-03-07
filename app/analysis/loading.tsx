import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Skeleton className="h-14 w-full rounded-[28px]" />
        </CardContent>
      </Card>
      <div className="panel-grid">
        <Card className="grid-span-12 grid-span-8">
          <CardHeader>
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-20 w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[280px] w-full" />
          </CardContent>
        </Card>
        <Card className="grid-span-12 grid-span-4">
          <CardHeader>
            <Skeleton className="h-8 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
