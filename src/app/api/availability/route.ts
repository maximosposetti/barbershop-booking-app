import { NextResponse } from "next/server";
import { getAvailability } from "@/server/reservations/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const barberId = searchParams.get("barberId");

  if (!barberId) {
    return NextResponse.json({ error: "barberId requerido" }, { status: 400 });
  }

  const daysParam = Number(searchParams.get("days") ?? 31);
  const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 31) : 31;
  const startParam = searchParams.get("start");
  const startDate = startParam ? new Date(`${startParam}T00:00:00`) : undefined;
  const availability = await getAvailability(barberId, days, startDate);

  return NextResponse.json({ availability });
}
