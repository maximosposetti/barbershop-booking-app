"use client";

import { UserPlus } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { PasswordField } from "@/components/PasswordField";
import { argentinaCityOptions } from "@/lib/argentina-cities";

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
      setError("Las contrasenas no coinciden.");
      setLoading(false);
      return;
    }

    const payload = {
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      city: form.get("city"),
      addressStreet: form.get("addressStreet"),
      addressNumber: form.get("addressNumber"),
      addressFloor: form.get("addressFloor"),
      addressApartment: form.get("addressApartment"),
      password
    };

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(typeof body.error === "string" ? body.error : "Revisa los datos ingresados.");
      setLoading(false);
      return;
    }

    const login = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
      callbackUrl
    });

    if (!login?.error && body.phoneVerification) {
      window.location.href = `/verificar-telefono?callbackUrl=${encodeURIComponent(callbackUrl)}`;
      return;
    }

    window.location.href = login?.url ?? callbackUrl;
  }

  return (
    <div className="auth-panel auth-panel-register">
      <h1>Crear cuenta</h1>
      <button className="auth-google-button" type="button" onClick={() => signIn("google", { callbackUrl })}>
        <span className="google-mark">
          <img src="/google-g.svg" alt="" />
        </span>
        Iniciar sesion con Google
      </button>
      <form className="form auth-form" onSubmit={onSubmit}>
        {error ? <div className="alert">{error}</div> : null}
        <input className="input auth-input" name="name" placeholder="Nombre" required />
        <input className="input auth-input" name="email" placeholder="Correo electronico" type="email" required />
        <input className="input auth-input" name="phone" placeholder="Telefono celular" inputMode="tel" required />
        <select className="input auth-input" name="city" defaultValue="" required>
          <option value="" disabled>
            Ciudad y provincia
          </option>
          {argentinaCityOptions.map((city) => (
            <option key={city.value} value={city.value}>
              {city.label}
            </option>
          ))}
        </select>
        <div className="auth-address-grid">
          <input className="input auth-input" name="addressStreet" placeholder="Calle" required />
          <input className="input auth-input" name="addressNumber" placeholder="Numero" inputMode="numeric" required />
          <input className="input auth-input" name="addressFloor" placeholder="Piso (opcional)" />
          <input className="input auth-input" name="addressApartment" placeholder="Depto (opcional)" />
        </div>
        <PasswordField name="password" placeholder="Contrasena" minLength={8} required />
        <PasswordField name="confirmPassword" placeholder="Confirmar contrasena" minLength={8} required />
        <button className="auth-submit" disabled={loading} type="submit">
          <UserPlus size={18} />
          {loading ? "Creando..." : "Registrarse"}
        </button>
      </form>
      <p className="auth-switch auth-switch-inline">
        Ya tenes una cuenta?
        <Link href={`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}>Iniciar sesion</Link>
      </p>
    </div>
  );
}
