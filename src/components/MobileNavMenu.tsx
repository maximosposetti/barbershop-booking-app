"use client";

import { LogIn, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { UserMenu } from "@/components/UserMenu";

type MobileNavMenuProps = {
  bookingHref: string;
  isAdmin: boolean;
  isLoggedIn: boolean;
  profileImage: string | null;
  profileName: string | null;
};

export function MobileNavMenu({ bookingHref, isAdmin, isLoggedIn, profileImage, profileName }: MobileNavMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  return (
    <div className="mobile-nav-actions" ref={menuRef}>
      <div className="mobile-nav-row">
        <button
          aria-expanded={open}
          aria-label={open ? "Cerrar menu" : "Abrir menu"}
          className="mobile-nav-toggle"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          {open ? <X size={19} /> : <Menu size={19} />}
          Menu
        </button>
        <Link className="button gold mobile-booking-button" href={bookingHref}>
          Agendar turno
        </Link>
        {!isLoggedIn ? (
          <Link className="button muted-green mobile-login-button" href="/auth/login">
            <LogIn size={18} />
          </Link>
        ) : (
          <UserMenu image={profileImage} isAdmin={isAdmin} name={profileName} />
        )}
      </div>

      {open ? (
        <nav className="mobile-nav-dropdown" aria-label="Menu movil">
          <Link href="/#barberos" onClick={() => setOpen(false)}>
            Barberos
          </Link>
          <Link href="/#galeria" onClick={() => setOpen(false)}>
            Galeria
          </Link>
          <Link href="/#ubicacion" onClick={() => setOpen(false)}>
            Ubicacion
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
