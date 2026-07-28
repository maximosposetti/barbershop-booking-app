"use client";

import { CalendarCheck, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type UserMenuProps = {
  image: string | null;
  isAdmin?: boolean;
  name: string | null;
};

export function UserMenu({ image, isAdmin = false, name }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const profileImage = image || "/default-pfp.jpg";

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-label="Abrir menu de usuario"
        className="user-menu-trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <img src={profileImage} alt={name ? `Foto de ${name}` : "Foto de perfil"} />
      </button>

      {open ? (
        <div className="user-menu-dropdown">
          <Link href="/perfil" onClick={() => setOpen(false)}>
            <UserRound size={17} /> Mi perfil
          </Link>
          {isAdmin ? (
            <Link className="user-menu-admin" href="/admin" onClick={() => setOpen(false)}>
              <LayoutDashboard size={17} /> Admin dashboard
            </Link>
          ) : null}
          <Link href="/mis-reservas" onClick={() => setOpen(false)}>
            <CalendarCheck size={17} /> Mis reservas
          </Link>
          <Link className="user-menu-logout" href="/auth/logout" onClick={() => setOpen(false)}>
            <LogOut size={17} /> Cerrar sesion
          </Link>
        </div>
      ) : null}
    </div>
  );
}
