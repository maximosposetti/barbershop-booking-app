"use client";

import { Send, Star } from "lucide-react";
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

export function ReviewSubmissionForm({ token }: { token: string }) {
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);

    const response = await fetch(`/api/reviews/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating,
        comment: form.get("comment")
      })
    });
    const body = await response.json().catch(() => ({}));

    if (response.ok) {
      setSent(true);
      setMessage("Gracias por compartir tu experiencia.");
    } else {
      setMessage(getApiErrorMessage(body, "No se pudo enviar la reseña."));
    }

    setLoading(false);
  }

  if (sent) {
    return <div className="alert success">{message}</div>;
  }

  return (
    <form className="form review-submit-form" onSubmit={submitReview}>
      <label>
        Puntuacion
        <div className="rating-picker" aria-label="Puntuacion de la reseña">
          {Array.from({ length: 5 }).map((_, index) => {
            const value = index + 1;
            return (
              <button
                aria-label={`${value} estrella${value === 1 ? "" : "s"}`}
                className={value <= rating ? "is-active" : ""}
                key={value}
                onClick={() => setRating(value)}
                type="button"
              >
                <Star size={28} fill="currentColor" />
              </button>
            );
          })}
        </div>
      </label>
      <label>
        Tu experiencia
        <textarea
          className="input"
          name="comment"
          placeholder="Contanos como fue la atencion, el corte y que destacarias del barbero."
          required
        />
      </label>
      {message ? <div className="alert">{message}</div> : null}
      <button className="button gold" disabled={loading} type="submit">
        <Send size={18} /> {loading ? "Enviando..." : "Enviar reseña"}
      </button>
    </form>
  );
}
