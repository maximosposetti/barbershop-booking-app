"use client";

import { Bot, ImagePlus, Maximize2, Minimize2, Send, X } from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

const examples = [
  "Quiero un corte prolijo para oficina, que me recomendas?",
  "Tengo pelo ondulado y cara redonda, que corte me queda mejor?",
  "Que barbero me conviene para un fade?",
  "Quiero algo moderno pero facil de mantener"
];

function getApiErrorMessage(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") return fallback;
  const error = (body as { error?: unknown }).error;
  return typeof error === "string" ? error : fallback;
}

export function StyleAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Puedo ayudarte a elegir corte, barbero, cuidados y horarios convenientes. Tambien podes subir una foto para una recomendacion mas personalizada."
    }
  ]);
  const [question, setQuestion] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);

  function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImage(file);

    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(file ? URL.createObjectURL(file) : "");
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(null);
    setImagePreview("");
  }

  async function askAssistant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentQuestion = question.trim();

    if (!currentQuestion && !image) return;

    setMessages((current) => [
      ...current,
      { role: "user", content: currentQuestion || "Quiero una recomendacion usando la foto." }
    ]);
    setQuestion("");
    setLoading(true);

    const form = new FormData();
    form.append("question", currentQuestion);
    if (image) form.append("image", image);

    const response = await fetch("/api/user/style-assistant", {
      method: "POST",
      body: form
    });
    const body = await response.json().catch(() => ({}));

    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: response.ok ? body.answer ?? "No pude interpretar la respuesta." : getApiErrorMessage(body, "No se pudo consultar la IA.")
      }
    ]);

    clearImage();
    setLoading(false);
  }

  return (
    <aside className={`ai-floating-card style-assistant-floating ${minimized ? "is-minimized" : ""}`}>
      <header className="ai-floating-header">
        <strong>
          <Bot size={18} /> Asistente IA de estilo
        </strong>
        <button
          aria-label={minimized ? "Agrandar asistente IA" : "Minimizar asistente IA"}
          className="icon-button"
          onClick={() => setMinimized((current) => !current)}
          title={minimized ? "Agrandar" : "Minimizar"}
          type="button"
        >
          {minimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
        </button>
      </header>

      {!minimized ? (
        <>
          <p className="style-assistant-intro">Recomendaciones de corte, barbero, cuidados y horarios.</p>

          <div className="style-examples">
            {examples.map((example) => (
              <button key={example} type="button" onClick={() => setQuestion(example)}>
                {example}
              </button>
            ))}
          </div>

          <div className="style-chat-log">
            {messages.map((message, index) => (
              <div className={`ai-message ${message.role}`} key={`${message.role}-${index}`}>
                {message.content}
              </div>
            ))}
            {loading ? <div className="ai-message assistant">Pensando recomendacion...</div> : null}
          </div>

          {imagePreview ? (
            <div className="style-image-preview">
              <img src={imagePreview} alt="Foto seleccionada" />
              <button className="icon-button" type="button" onClick={clearImage} title="Quitar foto">
                <X size={16} />
              </button>
            </div>
          ) : null}

          <form className="style-assistant-form" onSubmit={askAssistant}>
            <label className="icon-button style-upload-button" title="Subir foto">
              <ImagePlus size={18} />
              <input accept="image/jpeg,image/png,image/webp" onChange={selectImage} type="file" />
            </label>
            <input
              className="input"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Preguntale por un corte, estilo o barbero"
            />
            <button className="button" disabled={loading || (!question.trim() && !image)} type="submit" title="Preguntar">
              <Send size={18} />
            </button>
          </form>
        </>
      ) : null}
    </aside>
  );
}
