import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { runPortfolioAnalysis } from "@/lib/orchestration/portfolio";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await runPortfolioAnalysis(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to analyze portfolio." }, { status: 500 });
  }
}
