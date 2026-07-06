"use client";

import { UserPlus } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export function RegisterForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/agendar";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password")
    };

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.json();
      setError(typeof body.error === "string" ? body.error : "Revisá los datos ingresados.");
      setLoading(false);
      return;
    }

    const login = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
      callbackUrl
    });

    window.location.href = login?.url ?? callbackUrl;
  }

  return (
    <div className="auth-panel">
      <h1>Crear cuenta</h1>
      <p>Registrate para reservar tu turno y recibir la confirmación por email.</p>
      <form className="form" onSubmit={onSubmit}>
        {error ? <div className="alert">{error}</div> : null}
        <label className="field">
          Nombre
          <input className="input" name="name" required />
        </label>
        <label className="field">
          Email
          <input className="input" name="email" type="email" required />
        </label>
        <label className="field">
          Contraseña
          <input className="input" name="password" type="password" minLength={8} required />
        </label>
        <button className="button" disabled={loading} type="submit">
          <UserPlus size={18} />
          {loading ? "Creando..." : "Crear cuenta"}
        </button>
      </form>
      <p>
        ¿Ya tenes cuenta? <Link href={`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Ingresá</Link>
      </p>
    </div>
  );
}
