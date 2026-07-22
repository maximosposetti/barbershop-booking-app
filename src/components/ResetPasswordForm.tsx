"use client";

import { Save } from "lucide-react";
import { FormEvent, useState } from "react";
import { PasswordField } from "@/components/PasswordField";

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
      setMessage("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });
    const body = await response.json().catch(() => ({}));

    setMessage(response.ok ? "Contraseña actualizada. Ya podés iniciar sesión." : body.error ?? "No se pudo cambiar la contraseña.");
    setLoading(false);
  }

  return (
    <section className="auth-card card">
      <div className="card-body">
        <h1>Cambiar contraseña</h1>
        <form className="form" onSubmit={resetPassword}>
          <PasswordField minLength={8} name="password" placeholder="Nueva contraseña" required />
          <PasswordField minLength={8} name="confirmation" placeholder="Repetir contraseña" required />
          <button className="button" disabled={loading || !token} type="submit">
            <Save size={18} /> {loading ? "Guardando..." : "Guardar contraseña"}
          </button>
        </form>
        {message ? <div className={message.includes("actualizada") ? "alert success" : "alert"}>{message}</div> : null}
      </div>
    </section>
  );
}
