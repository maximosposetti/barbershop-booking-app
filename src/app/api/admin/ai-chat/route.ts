import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getBusinessAnalytics } from "@/server/analytics/dashboard";

const chatSchema = z.object({
  question: z.string().min(3).max(800),
  period: z.enum(["today", "7d", "30d", "year"]).default("30d")
});

function extractOpenAiText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const outputText = (payload as { output_text?: unknown }).output_text;
  if (typeof outputText === "string") return outputText;

  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";

  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as { content?: unknown }).content;
      return Array.isArray(content) ? content : [];
    })
    .map((content) => {
      if (!content || typeof content !== "object") return "";
      const text = (content as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .filter(Boolean)
    .join("\n");
}

function getOpenAiErrorMessage(payload: unknown, status: number) {
  const error = payload && typeof payload === "object" ? (payload as { error?: { code?: string; message?: string; type?: string } }).error : undefined;
  const code = error?.code ?? "";
  const type = error?.type ?? "";
  const message = error?.message ?? "";
  const normalized = `${code} ${type} ${message}`.toLowerCase();

  if (normalized.includes("insufficient_quota") || normalized.includes("exceeded your current quota") || normalized.includes("billing")) {
    return "La API de OpenAI no tiene cuota o facturacion disponible. Tu plan de ChatGPT no incluye automaticamente credito de API: revisa Billing en platform.openai.com, agrega un metodo de pago o crea una API key de un proyecto con saldo.";
  }

  if (status === 401 || normalized.includes("invalid_api_key") || normalized.includes("incorrect api key")) {
    return "La clave OPENAI_API_KEY no es valida o fue revocada. Genera una nueva API key en platform.openai.com y actualiza tu archivo .env.";
  }

  if (status === 429 || normalized.includes("rate limit")) {
    return "OpenAI esta limitando las solicitudes por uso alto. Espera unos minutos y volve a intentar.";
  }

  if (normalized.includes("model") && (normalized.includes("does not exist") || normalized.includes("access"))) {
    return "El modelo configurado no esta disponible para tu cuenta. Cambia OPENAI_MODEL en .env por un modelo al que tu proyecto tenga acceso.";
  }

  return "No se pudo consultar la IA. Revisa la configuracion de OpenAI y vuelve a intentar.";
}

export async function POST(request: Request) {
  await requireAdmin();
  const body = await request.json();
  const parsed = chatSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Pregunta invalida." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Falta configurar OPENAI_API_KEY en el archivo .env para activar el chat de IA." },
      { status: 503 }
    );
  }

  const analytics = await getBusinessAnalytics(parsed.data.period);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
      input: [
        {
          role: "system",
          content:
            "Sos un analista de negocio para una barberia. Responde en espanol rioplatense, claro y accionable. Usa solo los datos JSON entregados. Si faltan datos, decilo. No inventes cifras."
        },
        {
          role: "user",
          content: `Datos del negocio:\n${JSON.stringify(analytics)}\n\nPregunta del administrador: ${parsed.data.question}`
        }
      ]
    })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    return NextResponse.json(
      { error: getOpenAiErrorMessage(errorBody, response.status) },
      { status: 502 }
    );
  }

  const result = await response.json();
  const answer = extractOpenAiText(result);

  return NextResponse.json({ answer: answer || "La IA no devolvio una respuesta interpretable." });
}
