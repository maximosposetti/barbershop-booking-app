import { LogIn, Scissors } from "lucide-react";
import Link from "next/link";
import { MobileNavMenu } from "@/components/MobileNavMenu";
import { UserMenu } from "@/components/UserMenu";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function NavBar() {
  const session = await getCurrentSession();
  const bookingHref = session?.user ? "/agendar" : "/auth/login?callbackUrl=/agendar";
  const profile = session?.user
    ? await prisma.user
        .findUnique({
          where: { id: session.user.id },
          select: { image: true, name: true }
        })
        .catch(() => null)
    : null;

  return (
    <header className="nav">
      <div className="shell nav-inner">
        <Link className="brand" href="/">
          <span className="brand-mark">
            <Scissors size={21} />
          </span>
          Barber Studio
        </Link>
        <nav className="nav-links">
          <Link href="/#barberos">Barberos</Link>
          <Link href="/#galeria">Galeria</Link>
          <Link href="/#ubicacion">Ubicacion</Link>
          <Link className="button gold" href={bookingHref}>
            Agendar turno
          </Link>
          {!session?.user ? (
            <Link className="button muted-green" href="/auth/login">
              <LogIn size={18} /> Ingresar
            </Link>
          ) : null}
          {session?.user ? (
            <UserMenu
              image={profile?.image ?? null}
              isAdmin={session.user.role === "ADMIN"}
              name={profile?.name ?? session.user.name ?? null}
            />
          ) : null}
        </nav>
        <MobileNavMenu
          bookingHref={bookingHref}
          isAdmin={session?.user?.role === "ADMIN"}
          isLoggedIn={Boolean(session?.user)}
          profileImage={profile?.image ?? null}
          profileName={profile?.name ?? session?.user?.name ?? null}
        />
      </div>
    </header>
  );
}
