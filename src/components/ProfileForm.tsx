"use client";

import { Save, Send, Upload } from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";
import { argentinaCityOptions } from "@/lib/argentina-cities";

type UserProfile = {
  name: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressFloor: string | null;
  addressApartment: string | null;
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileImage, setProfileImage] = useState(user.image || "/default-pfp.jpg");
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
        city: form.get("city"),
        addressStreet: form.get("addressStreet"),
        addressNumber: form.get("addressNumber"),
        addressFloor: form.get("addressFloor"),
        addressApartment: form.get("addressApartment")
      })
    });
    const body = await response.json().catch(() => ({}));

    if (response.ok && body.requiresPhoneVerification && typeof body.redirectTo === "string") {
      window.location.href = body.redirectTo;
      return;
    }

    setMessage(response.ok ? "Perfil actualizado." : getApiErrorMessage(body, "No se pudo actualizar el perfil."));
    setSaving(false);
  }

  async function uploadProfileImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setMessage("");

    const previousImage = profileImage;
    const previewUrl = URL.createObjectURL(file);
    setProfileImage(previewUrl);

    const form = new FormData();
    form.append("file", file);

    const response = await fetch("/api/profile/image", {
      method: "POST",
      body: form
    });
    const body = await response.json().catch(() => ({}));

    if (response.ok && typeof body.image === "string") {
      setProfileImage(body.image);
      setMessage("Foto de perfil actualizada.");
    } else {
      setProfileImage(previousImage);
      setMessage(getApiErrorMessage(body, "No se pudo actualizar la foto de perfil."));
    }

    URL.revokeObjectURL(previewUrl);
    setUploadingImage(false);
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
        ? "Te enviamos un correo con el enlace para cambiar tu contrasena."
        : "No se pudo enviar el correo de cambio de contrasena."
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
              Correo electronico
              <input className="input" name="email" defaultValue={user.email} disabled />
            </label>
            <label>
              Telefono celular
              <input className="input" name="phone" defaultValue={user.phone ?? ""} inputMode="tel" required />
            </label>
            <label>
              Ciudad y provincia
              <select className="input" name="city" defaultValue={user.city ?? ""} required>
                <option value="" disabled>
                  Ciudad y provincia
                </option>
                {argentinaCityOptions.map((city) => (
                  <option key={city.value} value={city.value}>
                    {city.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="profile-address-grid">
              <label>
                Calle
                <input className="input" name="addressStreet" defaultValue={user.addressStreet ?? ""} required />
              </label>
              <label>
                Numero
                <input className="input" name="addressNumber" defaultValue={user.addressNumber ?? ""} inputMode="numeric" required />
              </label>
              <label>
                Piso
                <input className="input" name="addressFloor" defaultValue={user.addressFloor ?? ""} placeholder="Opcional" />
              </label>
              <label>
                Departamento
                <input className="input" name="addressApartment" defaultValue={user.addressApartment ?? ""} placeholder="Opcional" />
              </label>
            </div>
            <div className="profile-photo-field">
              <span>Foto de perfil</span>
              <div className="profile-photo-control">
                <img src={profileImage} alt="Foto de perfil actual" />
                <label className="button secondary profile-photo-button">
                  <Upload size={18} /> {uploadingImage ? "Subiendo..." : "Cambiar foto"}
                  <input accept="image/jpeg,image/png,image/webp" disabled={uploadingImage} onChange={uploadProfileImage} type="file" />
                </label>
              </div>
            </div>
            <button className="button" disabled={saving} type="submit">
              <Save size={18} /> {saving ? "Guardando..." : "Guardar perfil"}
            </button>
          </form>
        </div>
      </section>

      <aside className="card">
        <div className="card-body">
          <h2>Contrasena</h2>
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
