import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/AdminPanel";
import { getCurrentSession } from "@/lib/auth";
import { demoAdminUser, demoBarbers } from "@/lib/demo-data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getCurrentSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/admin");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const { barbers, reservations, users, databaseReady } = await Promise.all([
    prisma.barber.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.reservation.findMany({
      orderBy: { startAt: "asc" },
      include: {
        barber: { select: { name: true } },
        user: { select: { name: true, email: true } }
      }
    }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true } })
  ])
    .then(([barbers, reservations, users]) => ({ barbers, reservations, users, databaseReady: true }))
    .catch(() => {
      console.warn("No se pudo leer datos de admin desde la base. Se muestra modo demo.");
      return {
        barbers: demoBarbers,
        reservations: [],
        users: [{ id: demoAdminUser.id, name: demoAdminUser.name, email: demoAdminUser.email }],
        databaseReady: false
      };
    });

  return (
    <main className="admin-page shell">
      <AdminPanel
        initialBarbers={barbers}
        initialReservations={reservations.map((reservation) => ({
          ...reservation,
          startAt: reservation.startAt instanceof Date ? reservation.startAt.toISOString() : reservation.startAt
        }))}
        initialUsers={users}
        databaseReady={databaseReady}
      />
    </main>
  );
}
