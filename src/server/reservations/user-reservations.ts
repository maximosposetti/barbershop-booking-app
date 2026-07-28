import { ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type UserReservationItem = {
  id: string;
  startAt: string;
  endAt: string;
  status: ReservationStatus;
  priceCents: number;
  barberName: string;
};

export async function getUserReservations(userId: string): Promise<UserReservationItem[]> {
  const reservations = await prisma.reservation.findMany({
    where: { userId },
    orderBy: { startAt: "desc" },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      status: true,
      priceCents: true,
      barber: { select: { name: true } }
    }
  });

  return reservations.map((reservation) => ({
    id: reservation.id,
    startAt: reservation.startAt.toISOString(),
    endAt: reservation.endAt.toISOString(),
    status: reservation.status,
    priceCents: reservation.priceCents,
    barberName: reservation.barber.name
  }));
}
