import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/ProfileForm";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/perfil");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      image: true
    }
  });

  if (!user) redirect("/auth/login?callbackUrl=/perfil");

  return (
    <main className="shell page-section">
      <ProfileForm user={user} />
    </main>
  );
}
