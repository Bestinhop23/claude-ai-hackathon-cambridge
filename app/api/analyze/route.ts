import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { runAnalysis } from "@/lib/orchestration/analyze";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await runAnalysis(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to complete analysis." }, { status: 500 });
  }
}
