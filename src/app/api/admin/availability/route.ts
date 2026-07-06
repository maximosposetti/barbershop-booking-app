import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { availabilityRuleSchema } from "@/lib/validators";

export async function POST(request: Request) {
  await requireAdmin();
  const body = await request.json();

  if (body.type === "block") {
    const block = await prisma.unavailableBlock.create({
      data: {
        barberId: body.barberId,
        startAt: new Date(body.startAt),
        endAt: new Date(body.endAt),
        reason: body.reason
      }
    });

    return NextResponse.json({ block }, { status: 201 });
  }

  const parsed = availabilityRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const existingRule = await prisma.availabilityRule.findFirst({
    where: {
      barberId: parsed.data.barberId,
      weekday: parsed.data.weekday,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime
    },
    select: { id: true }
  });

  if (existingRule) {
    return NextResponse.json({ error: "Ese horario ya esta cargado para este barbero." }, { status: 409 });
  }

  const rule = await prisma.availabilityRule.create({ data: parsed.data });
  return NextResponse.json({ rule }, { status: 201 });
}

export async function DELETE(request: Request) {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type");

  if (!id || !type) {
    return NextResponse.json({ error: "id y type son requeridos" }, { status: 400 });
  }

  if (type === "block") {
    await prisma.unavailableBlock.delete({ where: { id } });
  } else {
    await prisma.availabilityRule.delete({ where: { id } });
  }

  return NextResponse.json({ deleted: true });
}
