import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { barberUpdateSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  await requireAdmin();
  const { id } = await context.params;
  const body = await request.json();
  const parsed = barberUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((issue) => issue.message).join(" ") }, { status: 400 });
  }

  const barber = await prisma.barber.update({
    where: { id },
    data: parsed.data
  });

  return NextResponse.json({ barber });
}

export async function DELETE(_request: Request, context: RouteContext) {
  await requireAdmin();
  const { id } = await context.params;
  const barber = await prisma.barber.findUnique({
    where: { id },
    select: { active: true }
  });

  if (!barber) {
    return NextResponse.json({ error: "Barbero no encontrado" }, { status: 404 });
  }

  if (barber.active) {
    return NextResponse.json({ error: "Solo se pueden eliminar definitivamente barberos inactivos" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.reservation.deleteMany({ where: { barberId: id } }),
    prisma.barber.delete({ where: { id } })
  ]);

  return NextResponse.json({ deleted: true });
}
