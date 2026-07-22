"use client";

import { UserPlus } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { PasswordField } from "@/components/PasswordField";

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
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      password
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
    <div className="auth-panel auth-panel-register">
      <h1>Crear cuenta</h1>
      <button className="auth-google-button" type="button" onClick={() => signIn("google", { callbackUrl })}>
        <span className="google-mark">
          <img src="/google-g.svg" alt="" />
        </span>
        Iniciar sesión con Google
      </button>
      <form className="form auth-form" onSubmit={onSubmit}>
        {error ? <div className="alert">{error}</div> : null}
        <input className="input auth-input" name="name" placeholder="Nombre" required />
        <input className="input auth-input" name="email" placeholder="Correo electrónico" type="email" required />
        <input className="input auth-input" name="phone" placeholder="Teléfono" />
        <PasswordField name="password" placeholder="Contraseña" minLength={8} required />
        <PasswordField name="confirmPassword" placeholder="Confirmar contraseña" minLength={8} required />
        <button className="auth-submit" disabled={loading} type="submit">
          <UserPlus size={18} />
          {loading ? "Creando..." : "Registrarse"}
        </button>
      </form>
      <p className="auth-switch auth-switch-inline">
        ¿Ya tenés una cuenta?
        <Link href={`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Iniciar sesión</Link>
      </p>
    </div>
  );
}
