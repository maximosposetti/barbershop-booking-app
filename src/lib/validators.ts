import { z } from "zod";
import { argentinaCityValues } from "@/lib/argentina-cities";

const halfHourTimeSchema = z
  .string()
  .regex(/^\d{2}:(00|30)$/, "Usa horarios terminados en :00 o :30")
  .refine((value) => {
    const [hours] = value.split(":").map(Number);
    return hours >= 0 && hours <= 23;
  }, "Usa una hora valida");

function normalizeNationalMobilePhone(value: string) {
  const digits = value.replace(/^0+/, "");

  if (/^15\d{8}$/.test(digits)) {
    return `11${digits.slice(2)}`;
  }

  for (const areaLength of [2, 3, 4]) {
    const subscriberLength = 10 - areaLength;
    const expectedLength = areaLength + 2 + subscriberLength;

    if (digits.length === expectedLength && digits.slice(areaLength, areaLength + 2) === "15") {
      return `${digits.slice(0, areaLength)}${digits.slice(areaLength + 2)}`;
    }
  }

  if (/^[1-9]\d{9}$/.test(digits)) {
    return digits;
  }

  return null;
}

function normalizeArgentinaWhatsappPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;

  let nationalNumber: string | null = null;

  if (digits.startsWith("549")) {
    nationalNumber = normalizeNationalMobilePhone(digits.slice(3));
  } else if (digits.startsWith("54")) {
    const withoutCountryCode = digits.slice(2);
    nationalNumber = normalizeNationalMobilePhone(
      withoutCountryCode.startsWith("9") ? withoutCountryCode.slice(1) : withoutCountryCode
    );
  } else {
    nationalNumber = normalizeNationalMobilePhone(digits);
  }

  return nationalNumber ? `+549${nationalNumber}` : null;
}

const argentinaPhoneSchema = z
  .string()
  .trim()
  .min(8, "Ingresa un telefono")
  .max(32, "El telefono es demasiado largo")
  .transform((value, context) => {
    const normalized = normalizeArgentinaWhatsappPhone(value);

    if (!normalized) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresa un telefono celular valido de Argentina"
      });
      return z.NEVER;
    }

    return normalized;
  });

const realisticEmailSchema = z
  .string()
  .email("Ingresa un correo valido")
  .max(120)
  .refine((value) => /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value), "Ingresa un correo con dominio valido");

const citySchema = z.string().refine((value) => argentinaCityValues.includes(value), "Selecciona una ciudad de la lista");

const userLocationShape = {
  phone: argentinaPhoneSchema,
  city: citySchema,
  addressStreet: z.string().min(2, "Ingresa la calle").max(90),
  addressNumber: z.string().min(1, "Ingresa el numero").max(12).regex(/^\d+[a-zA-Z]?$/, "Ingresa un numero de calle valido"),
  addressFloor: z.string().max(12).optional().or(z.literal("")),
  addressApartment: z.string().max(12).optional().or(z.literal(""))
};

export const registerSchema = z.object({
  name: z.string().min(2, "Ingresa tu nombre"),
  email: realisticEmailSchema,
  ...userLocationShape,
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres")
});

export const profileSchema = z.object({
  name: z.string().min(2, "Ingresa tu nombre").max(80),
  ...userLocationShape
});

export const passwordResetRequestSchema = z.object({
  email: realisticEmailSchema.optional()
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres")
});

export const barberSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().min(10),
  imageUrl: z.string().url(),
  active: z.boolean().default(true)
});

export const barberUpdateSchema = barberSchema.partial().extend({
  active: z.boolean().optional()
});

export const availabilityRuleSchema = z
  .object({
    barberId: z.string().min(1),
    weekday: z.number().int().min(0).max(6),
    startTime: halfHourTimeSchema,
    endTime: halfHourTimeSchema,
    slotMinutes: z.literal(30)
  })
  .refine((value) => value.startTime < value.endTime, {
    message: "La hora de fin debe ser posterior a la hora de inicio",
    path: ["endTime"]
  });

export const reservationSchema = z.object({
  barberId: z.string().min(1),
  startAt: z.string().datetime(),
  notes: z.string().max(500).optional()
});

export const adminReservationSchema = reservationSchema.extend({
  userId: z.string().min(1),
  status: z.enum(["PENDING_PAYMENT", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]).default("CONFIRMED")
});

export const businessSettingsSchema = z.object({
  haircutPriceCents: z.number().int().min(100, "El precio debe ser mayor a 0").max(100000000, "El precio es demasiado alto")
});

export const reviewSubmissionSchema = z.object({
  rating: z.number().int().min(1, "Selecciona al menos 1 estrella").max(5, "La puntuacion maxima es 5 estrellas"),
  comment: z.string().trim().min(10, "Contanos un poco mas sobre tu experiencia").max(1000, "La reseña es demasiado larga")
});
