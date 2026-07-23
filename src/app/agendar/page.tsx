import { redirect } from "next/navigation";
import { BookingFlow } from "@/components/BookingFlow";
import { getCurrentSession } from "@/lib/auth";
import { demoBarbers } from "@/lib/demo-data";
import { prisma } from "@/lib/prisma";
import { releasePendingPaymentReservationsForUser } from "@/server/reservations/service";
import { DEFAULT_HAIRCUT_PRICE_CENTS, getBusinessSettings } from "@/server/settings/service";

export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const session = await getCurrentSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/agendar");
  }

  await releasePendingPaymentReservationsForUser(session.user.id).catch(() => undefined);

  const { barbers, haircutPriceCents } = await Promise.all([
    prisma.barber.findMany({
        where: { active: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, description: true, imageUrl: true }
      }),
    getBusinessSettings()
  ])
    .then(([barbers, settings]) => ({
      barbers,
      haircutPriceCents: settings.haircutPriceCents
    }))
    .catch(() => {
      console.warn("No se pudo leer barberos desde la base de datos. Se muestran datos demo.");
      return {
        barbers: demoBarbers.map(({ id, name, description, imageUrl }) => ({ id, name, description, imageUrl })),
        haircutPriceCents: DEFAULT_HAIRCUT_PRICE_CENTS
      };
    });

  return (
    <main className="booking-page shell">
      <BookingFlow barbers={barbers} haircutPriceCents={haircutPriceCents} />
    </main>
  );
}
