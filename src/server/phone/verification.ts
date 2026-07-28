import { createHash, randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";

const codeLength = 6;
const expirationMinutes = 10;

function hashPhoneCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function generatePhoneCode() {
  return String(randomInt(0, 10 ** codeLength)).padStart(codeLength, "0");
}

function getWhatsappConfig() {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    templateName: process.env.WHATSAPP_TEMPLATE_NAME ?? "phone_verification_code",
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "es_AR",
    graphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION ?? "v20.0"
  };
}

async function sendWhatsappCode(phone: string, code: string) {
  const config = getWhatsappConfig();

  if (!config.accessToken || !config.phoneNumberId) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Faltan WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID.");
    }

    console.warn(`Codigo WhatsApp dev para ${phone}: ${code}`);
    return { sentAt: null, devCode: code };
  }

  const response = await fetch(`https://graph.facebook.com/${config.graphApiVersion}/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone.replace(/\D/g, ""),
      type: "template",
      template: {
        name: config.templateName,
        language: { code: config.templateLanguage },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: code }]
          }
        ]
      }
    })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    console.error("No se pudo enviar el codigo por WhatsApp", body);
    throw new Error("No se pudo enviar el codigo por WhatsApp. Revisa las credenciales y la plantilla.");
  }

  return { sentAt: new Date(), devCode: null };
}

export async function createAndSendPhoneVerificationCode({ userId, phone }: { userId: string; phone: string }) {
  const code = generatePhoneCode();
  const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
  const delivery = await sendWhatsappCode(phone, code);

  await prisma.phoneVerificationCode.create({
    data: {
      userId,
      phone,
      codeHash: hashPhoneCode(code),
      expiresAt,
      sentAt: delivery.sentAt
    }
  });

  return {
    expiresAt,
    devCode: delivery.devCode
  };
}

export async function verifyPhoneCode({ userId, code }: { userId: string; code: string }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true }
  });

  if (!user?.phone) {
    throw new Error("No hay telefono para verificar.");
  }

  const verification = await prisma.phoneVerificationCode.findFirst({
    where: {
      userId,
      phone: user.phone,
      usedAt: null
    },
    orderBy: { createdAt: "desc" }
  });

  if (!verification) {
    throw new Error("No hay un codigo pendiente. Solicita uno nuevo.");
  }

  if (verification.expiresAt.getTime() < Date.now()) {
    throw new Error("El codigo vencio. Solicita uno nuevo.");
  }

  if (verification.codeHash !== hashPhoneCode(code)) {
    throw new Error("El codigo no es correcto.");
  }

  await prisma.$transaction([
    prisma.phoneVerificationCode.update({
      where: { id: verification.id },
      data: { usedAt: new Date() }
    }),
    prisma.user.update({
      where: { id: userId },
      data: { phoneVerifiedAt: new Date() }
    })
  ]);
}
