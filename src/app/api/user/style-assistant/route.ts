import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBusinessSettings } from "@/server/settings/service";

export const runtime = "nodejs";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 3 * 1024 * 1024;

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
    return "La IA no tiene credito de API disponible. El plan de ChatGPT no incluye automaticamente credito para la API de OpenAI.";
  }

  if (status === 401 || normalized.includes("invalid_api_key") || normalized.includes("incorrect api key")) {
    return "La clave de OpenAI no es valida o fue revocada. Revisa OPENAI_API_KEY.";
  }

  if (status === 429 || normalized.includes("rate limit")) {
    return "La IA esta recibiendo demasiadas consultas. Espera unos minutos y volve a intentar.";
  }

  if (normalized.includes("model") && (normalized.includes("does not exist") || normalized.includes("access"))) {
    return "El modelo de IA configurado no esta disponible para esta cuenta.";
  }

  return "No se pudo consultar la IA. Intenta de nuevo en unos minutos.";
}

function buildAvailabilitySummary(
  rules: { weekday: number; startTime: string; endTime: string; barber: { name: string } }[]
) {
  const weekdayLabels = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  return rules.map((rule) => ({
    barbero: rule.barber.name,
    dia: weekdayLabels[rule.weekday] ?? "dia",
    desde: rule.startTime,
    hasta: rule.endTime
  }));
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Inicia sesion para usar el asistente de estilo." }, { status: 401 });
  }

  const formData = await request.formData();
  const question = String(formData.get("question") ?? "").trim();
  const imageFile = formData.get("image");

  if (question.length < 3 && !(imageFile instanceof File)) {
    return NextResponse.json({ error: "Escribi una consulta o subi una foto para recibir una recomendacion." }, { status: 400 });
  }

  if (question.length > 900) {
    return NextResponse.json({ error: "La consulta es demasiado larga." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Falta configurar OPENAI_API_KEY para activar el asistente IA." }, { status: 503 });
  }

  let imageContent: { type: "input_image"; image_url: string } | null = null;
  if (imageFile instanceof File && imageFile.size > 0) {
    if (!allowedImageTypes.has(imageFile.type)) {
      return NextResponse.json({ error: "La foto debe ser JPG, PNG o WebP." }, { status: 400 });
    }

    if (imageFile.size > maxImageBytes) {
      return NextResponse.json({ error: "La foto no puede superar los 3 MB." }, { status: 400 });
    }

    const bytes = Buffer.from(await imageFile.arrayBuffer());
    imageContent = {
      type: "input_image",
      image_url: `data:${imageFile.type};base64,${bytes.toString("base64")}`
    };
  }

  const [barbers, rules, settings, reservations] = await Promise.all([
    prisma.barber.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
      select: { name: true, description: true }
    }),
    prisma.availabilityRule.findMany({
      where: { barber: { active: true } },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
      select: { weekday: true, startTime: true, endTime: true, barber: { select: { name: true } } }
    }),
    getBusinessSettings(),
    prisma.reservation.findMany({
      where: { userId: session.user.id },
      take: 5,
      orderBy: { startAt: "desc" },
      select: {
        startAt: true,
        status: true,
        barber: { select: { name: true } }
      }
    })
  ]);

  const businessContext = {
    barberia: "Barber Studio, Villa Constitucion, Santa Fe",
    precioCortePesos: settings.haircutPriceCents / 100,
    barberos: barbers,
    horariosHabituales: buildAvailabilitySummary(rules),
    historialPropio: reservations.map((reservation) => ({
      fecha: reservation.startAt.toISOString(),
      estado: reservation.status,
      barbero: reservation.barber.name
    }))
  };

  const userContent: ({ type: "input_text"; text: string } | { type: "input_image"; image_url: string })[] = [
    {
      type: "input_text",
      text: `Datos publicos y propios permitidos:\n${JSON.stringify(businessContext)}\n\nConsulta del usuario: ${
        question || "Analiza la foto y recomienda un estilo adecuado."
      }`
    }
  ];

  if (imageContent) userContent.push(imageContent);

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
            "Sos un asesor de estilo de una barberia de Villa Constitucion, Santa Fe. Responde siempre en espanol rioplatense. Solo podes hablar de cortes de pelo, barba, estilo, cuidados, productos, barberos, precio, reservas y horarios. Si el usuario pregunta otra cosa, responde brevemente que solo podes ayudar con temas de barberia. No diagnostiques problemas medicos. Si recibis una foto, usala solo para sugerir estilo general, sin identificar a la persona. Da recomendaciones concretas y amables."
        },
        {
          role: "user",
          content: userContent
        }
      ]
    })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    return NextResponse.json({ error: getOpenAiErrorMessage(errorBody, response.status) }, { status: 502 });
  }

  const result = await response.json();
  const answer = extractOpenAiText(result);

  return NextResponse.json({ answer: answer || "La IA no devolvio una respuesta interpretable." });
}
