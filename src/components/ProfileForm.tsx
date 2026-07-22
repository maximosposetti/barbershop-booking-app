"use client";

import { Save, Send } from "lucide-react";
import { FormEvent, useState } from "react";

type UserProfile = {
  name: string | null;
  email: string;
  phone: string | null;
  image: string | null;
};

function getApiErrorMessage(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") return fallback;
  const error = (body as { error?: unknown }).error;

  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const messages = Object.values(error)
      .flat()
      .filter((value): value is string => typeof value === "string");

    if (messages.length) return messages.join(" ");
  }

  return fallback;
}

export function ProfileForm({ user }: { user: UserProfile }) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        phone: form.get("phone"),
        image: form.get("image")
      })
    });
    const body = await response.json().catch(() => ({}));

    setMessage(response.ok ? "Perfil actualizado." : getApiErrorMessage(body, "No se pudo actualizar el perfil."));
    setSaving(false);
  }

  async function requestPasswordReset() {
    setSendingReset(true);
    setMessage("");
    const response = await fetch("/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    setMessage(
      response.ok
        ? "Te enviamos un correo con el enlace para cambiar tu contraseña."
        : "No se pudo enviar el correo de cambio de contraseña."
    );
    setSendingReset(false);
  }

  return (
    <div className="profile-layout">
      <section className="card">
        <div className="card-body">
          <h1>Mi perfil</h1>
          <form className="form" onSubmit={updateProfile}>
            <label>
              Nombre
              <input className="input" name="name" defaultValue={user.name ?? ""} required />
            </label>
            <label>
              Correo electrónico
              <input className="input" name="email" defaultValue={user.email} disabled />
            </label>
            <label>
              Teléfono
              <input className="input" name="phone" defaultValue={user.phone ?? ""} />
            </label>
            <label>
              URL de foto de perfil
              <input className="input" name="image" defaultValue={user.image ?? ""} placeholder="https://..." />
            </label>
            <button className="button" disabled={saving} type="submit">
              <Save size={18} /> {saving ? "Guardando..." : "Guardar perfil"}
            </button>
          </form>
        </div>
      </section>

      <aside className="card">
        <div className="card-body">
          <h2>Contraseña</h2>
          <p>Para cambiarla te enviamos un enlace seguro a tu correo. El enlace vence en 30 minutos.</p>
          <button className="button secondary" disabled={sendingReset} onClick={requestPasswordReset} type="button">
            <Send size={18} /> {sendingReset ? "Enviando..." : "Enviar enlace"}
          </button>
          {message ? <div className="alert success">{message}</div> : null}
        </div>
      </aside>
    </div>
  );
}
