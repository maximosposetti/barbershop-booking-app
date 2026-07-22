"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export function LogoutConfirm() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await signOut({ callbackUrl: "/" });
  }

  return (
    <section className="logout-panel">
      <h1>Cerrar sesión</h1>
      <p>¿Seguro que querés cerrar tu sesión?</p>
      <button className="button gold" disabled={loading} onClick={handleLogout} type="button">
        <LogOut size={18} />
        {loading ? "Cerrando..." : "Cerrar sesión"}
      </button>
      <Link className="button secondary" href="/">
        Cancelar
      </Link>
    </section>
  );
}
