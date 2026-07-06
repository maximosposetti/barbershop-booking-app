import { z } from "zod";

const halfHourTimeSchema = z
  .string()
  .regex(/^\d{2}:(00|30)$/, "Usa horarios terminados en :00 o :30")
  .refine((value) => {
    const [hours] = value.split(":").map(Number);
    return hours >= 0 && hours <= 23;
  }, "Usa una hora valida");

export const registerSchema = z.object({
  name: z.string().min(2, "Ingresá tu nombre"),
  email: z.string().email("Ingresá un email válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres")
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

export const availabilityRuleSchema = z.object({
  barberId: z.string().min(1),
  weekday: z.number().int().min(0).max(6),
  startTime: halfHourTimeSchema,
  endTime: halfHourTimeSchema,
  slotMinutes: z.literal(30)
}).refine((value) => value.startTime < value.endTime, {
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
  status: z.enum(["PENDING_PAYMENT", "CONFIRMED", "CANCELLED"]).default("CONFIRMED")
});
