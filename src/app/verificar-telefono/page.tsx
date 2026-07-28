import { redirect } from "next/navigation";
import { PhoneVerificationForm } from "@/components/PhoneVerificationForm";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PhoneVerificationPage({
  searchParams
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/verificar-telefono");
  }

  const params = await searchParams;
  const callbackUrl = params.callbackUrl?.startsWith("/") ? params.callbackUrl : "/perfil";
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { phone: true, phoneVerifiedAt: true }
  });

  if (!user?.phone) redirect("/perfil");
  if (user.phoneVerifiedAt) redirect(callbackUrl);

  return (
    <main className="auth-page shell">
      <PhoneVerificationForm phone={user.phone} callbackUrl={callbackUrl} />
    </main>
  );
}
