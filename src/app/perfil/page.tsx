import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/ProfileForm";
import { UserReservations } from "@/components/UserReservations";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserReservations } from "@/server/reservations/user-reservations";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/perfil");
  }

  const [user, reservations] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        phone: true,
        city: true,
        addressStreet: true,
        addressNumber: true,
        addressFloor: true,
        addressApartment: true,
        image: true
      }
    }),
    getUserReservations(session.user.id)
  ]);

  if (!user) redirect("/auth/login?callbackUrl=/perfil");

  return (
    <main className="shell page-section profile-page-stack">
      <ProfileForm user={user} />
      <UserReservations reservations={reservations} />
    </main>
  );
}
