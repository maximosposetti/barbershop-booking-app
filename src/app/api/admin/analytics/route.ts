import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getBusinessAnalytics } from "@/server/analytics/dashboard";

const periods = ["today", "7d", "30d", "year"] as const;

export async function GET(request: Request) {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period");
  const selectedPeriod = periods.find((item) => item === period) ?? "30d";
  const analytics = await getBusinessAnalytics(selectedPeriod);

  return NextResponse.json({ analytics });
}
