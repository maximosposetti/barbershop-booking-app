"use client";

import { InputHTMLAttributes, useState } from "react";

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  buttonLabel?: string;
};

export function PasswordField({ buttonLabel = "Ver contraseña", className = "input", ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input {...props} className={className} type={visible ? "text" : "password"} />
      <button
        aria-label={visible ? "Ocultar contraseña" : buttonLabel}
        className="password-toggle"
        onClick={() => setVisible((current) => !current)}
        title={visible ? "Ocultar" : "Ver"}
        type="button"
      >
        <span>{visible ? "Ocultar" : "Ver"}</span>
      </button>
    </div>
  );
}
