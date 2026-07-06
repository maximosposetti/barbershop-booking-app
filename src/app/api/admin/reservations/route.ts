import { ReservationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminReservationSchema } from "@/lib/validators";
import { createUserReservation } from "@/server/reservations/service";

export async function GET() {
  await requireAdmin();

  const reservations = await prisma.reservation.findMany({
    orderBy: { startAt: "asc" },
    include: {
      barber: true,
      user: { select: { id: true, name: true, email: true } },
      payment: true
    }
  });

  return NextResponse.json({ reservations });
}

export async function POST(request: Request) {
  await requireAdmin();
  const body = await request.json();
  const parsed = adminReservationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const reservation = await createUserReservation({
      userId: parsed.data.userId,
      barberId: parsed.data.barberId,
      startAt: new Date(parsed.data.startAt),
      notes: parsed.data.notes,
      createdByAdmin: true,
      status: parsed.data.status as ReservationStatus
    });

    return NextResponse.json({ reservation }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo crear la reserva" },
      { status: 409 }
    );
  }
}
