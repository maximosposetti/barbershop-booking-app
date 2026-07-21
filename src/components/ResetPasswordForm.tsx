"use client";

import { Save } from "lucide-react";
import { FormEvent, useState } from "react";

export function ResetPasswordForm({ token }: { token: string }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");

    if (password !== confirmation) {
      setMessage("Las contrasenas no coinciden.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });
    const body = await response.json().catch(() => ({}));

    setMessage(response.ok ? "Contrasena actualizada. Ya podes iniciar sesion." : body.error ?? "No se pudo cambiar la contrasena.");
    setLoading(false);
  }

  return (
    <section className="auth-card card">
      <div className="card-body">
        <h1>Cambiar contrasena</h1>
        <form className="form" onSubmit={resetPassword}>
          <input className="input" minLength={8} name="password" placeholder="Nueva contrasena" required type="password" />
          <input className="input" minLength={8} name="confirmation" placeholder="Repetir contrasena" required type="password" />
          <button className="button" disabled={loading || !token} type="submit">
            <Save size={18} /> {loading ? "Guardando..." : "Guardar contrasena"}
          </button>
        </form>
        {message ? <div className={message.includes("actualizada") ? "alert success" : "alert"}>{message}</div> : null}
      </div>
    </section>
  );
}
