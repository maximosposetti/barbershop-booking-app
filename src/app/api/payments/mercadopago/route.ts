import { NextResponse } from "next/server";
import { ReservationStatus } from "@prisma/client";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMercadoPagoPreference } from "@/server/payments/mercadopago";

async function releasePendingReservationAfterPaymentFailure(reservationId: string, userId: string) {
  const reservation = await prisma.reservation.findFirst({
    where: {
      id: reservationId,
      userId,
      status: ReservationStatus.PENDING_PAYMENT
    },
    include: { payment: true }
  });

  if (!reservation || reservation.payment?.preferenceId || reservation.payment?.externalId) return;

  await prisma.reservation.delete({ where: { id: reservation.id } });
}

export async function POST(request: Request) {
  let reservationId: string | undefined;
  let sessionUserId: string | undefined;

  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    sessionUserId = session.user.id;

    const body = await request.json();
    reservationId = body.reservationId;
    if (typeof reservationId !== "string" || !reservationId) {
      return NextResponse.json({ error: "Reserva invalida" }, { status: 400 });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { userId: true }
    });

    if (!reservation || reservation.userId !== session.user.id) {
      return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    const preference = await createMercadoPagoPreference(reservationId);

    return NextResponse.json({
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error al iniciar Mercado Pago:", message);
    if (reservationId && sessionUserId) {
      await releasePendingReservationAfterPaymentFailure(reservationId, sessionUserId).catch((cleanupError) => {
        console.error("No se pudo liberar la reserva pendiente:", cleanupError);
      });
    }

    return NextResponse.json(
      {
        error:
          "No se pudo iniciar Mercado Pago. Verifica el access token, la URL publica de la app y el tipo de checkout configurado.",
        detail: message
      },
      { status: 500 }
    );
  }
}
