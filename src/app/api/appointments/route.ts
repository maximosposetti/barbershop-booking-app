import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { reservationSchema } from "@/lib/validators";
import { createUserReservation } from "@/server/reservations/service";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Inicia sesion para reservar" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = reservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const reservation = await createUserReservation({
      userId: session.user.id,
      barberId: parsed.data.barberId,
      startAt: new Date(parsed.data.startAt),
      notes: parsed.data.notes
    });

    return NextResponse.json({ reservation });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo crear la reserva" },
      { status: 409 }
    );
  }
}
