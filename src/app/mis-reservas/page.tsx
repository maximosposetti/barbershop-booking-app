import { redirect } from "next/navigation";
import { UserReservations } from "@/components/UserReservations";
import { getCurrentSession } from "@/lib/auth";
import { getUserReservations } from "@/server/reservations/user-reservations";

export const dynamic = "force-dynamic";

export default async function MyReservationsPage() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/mis-reservas");
  }

  const reservations = await getUserReservations(session.user.id);

  return (
    <main className="shell page-section">
      <UserReservations reservations={reservations} />
    </main>
  );
}
