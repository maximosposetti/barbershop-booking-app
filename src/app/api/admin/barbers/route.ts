import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { barberSchema } from "@/lib/validators";

export async function GET() {
  await requireAdmin();
  const barbers = await prisma.barber.findMany({
    orderBy: { createdAt: "desc" },
    include: { availabilityRules: true }
  });

  return NextResponse.json({ barbers });
}

export async function POST(request: Request) {
  await requireAdmin();
  const body = await request.json();
  const parsed = barberSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((issue) => issue.message).join(" ") }, { status: 400 });
  }

  const barber = await prisma.barber.create({ data: parsed.data });
  return NextResponse.json({ barber }, { status: 201 });
}
