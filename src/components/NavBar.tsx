import { Scissors } from "lucide-react";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";

export async function NavBar() {
  const session = await getCurrentSession();
  const bookingHref = session?.user ? "/agendar" : "/auth/login?callbackUrl=/agendar";

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
          <Link href="/#galeria">Galería</Link>
          <Link href="/#ubicacion">Ubicación</Link>
          {session?.user?.role === "ADMIN" ? <Link href="/admin">Admin</Link> : null}
          {session?.user ? <Link href="/perfil">Mi perfil</Link> : null}
          {session?.user ? <Link href="/auth/logout">Salir</Link> : <Link href="/auth/login">Ingresar</Link>}
          <Link className="button gold" href={bookingHref}>
            Agendar turno
          </Link>
        </nav>
      </div>
    </header>
  );
}
