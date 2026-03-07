import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { runStockDataAction } from "@/lib/api/stock-data";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const result = await runStockDataAction(url.searchParams);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to complete stock-data action." }, { status: 500 });
  }
}
