"use client";

import { MessageCircle, RotateCcw, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";

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

export function PhoneVerificationForm({ phone, callbackUrl }: { phone: string; callbackUrl: string }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [devCode, setDevCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifying(true);
    setMessage("");

    const response = await fetch("/api/phone-verification/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
    const body = await response.json().catch(() => ({}));

    if (response.ok) {
      window.location.href = callbackUrl;
      return;
    }

    setMessage(getApiErrorMessage(body, "No se pudo verificar el telefono."));
    setVerifying(false);
  }

  async function resendCode() {
    setResending(true);
    setMessage("");
    setDevCode("");

    const response = await fetch("/api/phone-verification/send", { method: "POST" });
    const body = await response.json().catch(() => ({}));

    if (response.ok) {
      setMessage("Te enviamos un nuevo codigo por WhatsApp.");
      if (typeof body.devCode === "string") setDevCode(body.devCode);
    } else {
      setMessage(getApiErrorMessage(body, "No se pudo reenviar el codigo."));
    }

    setResending(false);
  }

  return (
    <div className="auth-panel phone-verification-panel">
      <h1>Verificar telefono</h1>
      <p>
        Enviamos un codigo de seguridad por WhatsApp a <strong>{phone}</strong>.
      </p>

      <form className="form auth-form" onSubmit={verifyCode}>
        {message ? <div className={message.includes("enviamos") ? "alert success" : "alert"}>{message}</div> : null}
        {devCode ? <div className="alert success">Codigo local de prueba: {devCode}</div> : null}
        <input
          className="input auth-input phone-code-input"
          inputMode="numeric"
          maxLength={6}
          minLength={6}
          name="code"
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="Codigo de 6 digitos"
          required
          value={code}
        />
        <button className="auth-submit" disabled={verifying || code.length !== 6} type="submit">
          <ShieldCheck size={18} /> {verifying ? "Verificando..." : "Verificar telefono"}
        </button>
      </form>

      <button className="button secondary" disabled={resending} onClick={resendCode} type="button">
        {resending ? <RotateCcw size={18} /> : <MessageCircle size={18} />}
        {resending ? "Reenviando..." : "Reenviar codigo"}
      </button>
    </div>
  );
}
