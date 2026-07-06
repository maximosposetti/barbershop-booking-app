import { ReservationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertReservationSlotAvailable, validateMinimumBookingNotice } from "@/server/reservations/service";

type RouteContext = { params: Promise<{ id: string }> };
const TURN_SLOT_MINUTES = 30;

export async function PUT(request: Request, context: RouteContext) {
  await requireAdmin();
  const { id } = await context.params;
  const body = await request.json();
  const startAt = body.startAt ? new Date(body.startAt) : undefined;

  try {
    const currentReservation = await prisma.reservation.findUnique({
      where: { id },
      select: { barberId: true, startAt: true, endAt: true }
    });

    if (!currentReservation) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    const nextStartAt = startAt ?? currentReservation.startAt;
    if (startAt) validateMinimumBookingNotice(startAt);

    const endAt = startAt ? new Date(startAt.getTime() + TURN_SLOT_MINUTES * 60_000) : undefined;
    const barberId = (body.barberId as string | undefined) ?? currentReservation.barberId;
    const status = body.status as ReservationStatus | undefined;
    const nextEndAt = endAt ?? currentReservation.endAt;

    if (status !== ReservationStatus.CANCELLED) {
      await assertReservationSlotAvailable(barberId, nextStartAt, nextEndAt, id);
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data: {
        userId: body.userId,
        barberId,
        startAt,
        endAt,
        status,
        notes: body.notes
      },
      include: {
        barber: true,
        user: { select: { name: true, email: true } },
        payment: true
      }
    });

    return NextResponse.json({ reservation });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar la reserva" },
      { status: 409 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  await requireAdmin();
  const { id } = await context.params;
  await prisma.reservation.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
