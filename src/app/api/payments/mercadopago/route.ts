import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMercadoPagoPreference } from "@/server/payments/mercadopago";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { reservationId } = await request.json();
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
}
