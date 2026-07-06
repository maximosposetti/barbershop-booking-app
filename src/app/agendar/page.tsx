import { redirect } from "next/navigation";
import { BookingFlow } from "@/components/BookingFlow";
import { getCurrentSession } from "@/lib/auth";
import { demoBarbers } from "@/lib/demo-data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const session = await getCurrentSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/agendar");
  }

  const barbers = await prisma.barber
    .findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, description: true, imageUrl: true }
    })
    .catch(() => {
      console.warn("No se pudo leer barberos desde la base de datos. Se muestran datos demo.");
      return demoBarbers.map(({ id, name, description, imageUrl }) => ({ id, name, description, imageUrl }));
    });

  return (
    <main className="booking-page shell">
      <BookingFlow barbers={barbers} />
    </main>
  );
}
