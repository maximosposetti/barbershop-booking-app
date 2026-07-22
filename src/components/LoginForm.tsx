"use client";

import { Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { PasswordField } from "@/components/PasswordField";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/agendar";
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

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
          : "Correo o contraseña incorrectos."
      );
      return;
    }

    window.location.href = response?.url ?? callbackUrl;
  }

  async function requestPasswordReset() {
    const emailInput = document.querySelector<HTMLInputElement>('input[name="email"]');
    const email = emailInput?.value.trim();

    if (!email) {
      setError("Ingresa tu correo para enviarte el enlace de recuperación.");
      return;
    }

    setResetLoading(true);
    setError("");
    setNotice("");

    const response = await fetch("/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    setNotice(
      response.ok
        ? "Si el correo existe, te enviamos un enlace para cambiar la contraseña."
        : "No se pudo enviar el correo de recuperación."
    );
    setResetLoading(false);
  }

  return (
    <div className="auth-panel">
      <h1>Inicia sesión</h1>
      <button className="auth-google-button" type="button" onClick={() => signIn("google", { callbackUrl })}>
        <span className="google-mark">
          <img src="/google-g.svg" alt="" />
        </span>
        Iniciar sesión con Google
      </button>
      <form className="form auth-form" onSubmit={onSubmit}>
        {error ? <div className="alert">{error}</div> : null}
        {notice ? <div className="alert success">{notice}</div> : null}
        <input className="input auth-input" name="email" placeholder="Correo electrónico" type="email" required />
        <PasswordField name="password" placeholder="Contraseña" required />
        <button className="auth-forgot" disabled={resetLoading} onClick={requestPasswordReset} type="button">
          {resetLoading ? "Enviando enlace..." : "¿Olvidaste tu contraseña?"}
        </button>
        <button className="auth-submit" disabled={loading} type="submit">
          <Mail size={18} />
          {loading ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>
      <p className="auth-switch">
        ¿No tenés un usuario registrado?
        <Link href={`/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Registrate acá</Link>
      </p>
    </div>
  );
}
