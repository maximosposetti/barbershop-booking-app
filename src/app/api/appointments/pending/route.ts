import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { releasePendingPaymentReservationsForUser } from "@/server/reservations/service";

export async function DELETE() {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await releasePendingPaymentReservationsForUser(session.user.id);
  return NextResponse.json({ released: result.count });
}
