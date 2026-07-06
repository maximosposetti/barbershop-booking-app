"use client";

import { LogIn, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/agendar";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const response = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
      callbackUrl
    });

    setLoading(false);

    if (response?.error) {
      setError(
        response.error === "DATABASE_UNAVAILABLE"
          ? "No se pudo conectar con la base de datos. Revisa DATABASE_URL y ejecuta las migraciones."
          : "Email o contraseña incorrectos."
      );
      return;
    }

    window.location.href = response?.url ?? callbackUrl;
  }

  return (
    <div className="auth-panel">
      <h1>Ingresar</h1>
      <p>Accede para elegir tu barbero, ver turnos disponibles y pagar la reserva.</p>
      <form className="form" onSubmit={onSubmit}>
        {error ? <div className="alert">{error}</div> : null}
        <label className="field">
          Email
          <input className="input" name="email" type="email" required />
        </label>
        <label className="field">
          Contraseña
          <input className="input" name="password" type="password" required />
        </label>
        <button className="button" disabled={loading} type="submit">
          <Mail size={18} />
          {loading ? "Ingresando..." : "Ingresar con email"}
        </button>
      </form>
      <button className="button secondary" style={{ width: "100%", marginTop: 12 }} onClick={() => signIn("google", { callbackUrl })}>
        <LogIn size={18} />
        Ingresar con Google
      </button>
      <p>
        ¿No tenes cuenta? <Link href={`/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Registrate</Link>
      </p>
    </div>
  );
}
