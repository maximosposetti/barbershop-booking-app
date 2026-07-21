import nodemailer from "nodemailer";

type ReservationEmail = {
  startAt: Date;
  barber: { name: string };
  user: { email: string; name: string | null };
};

function createMailTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

export async function sendReservationConfirmation(reservation: ReservationEmail) {
  const transporter = createMailTransporter();

  if (!transporter) {
    console.warn("SMTP no configurado. Se omite email de confirmacion.");
    return;
  }

  const date = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(reservation.startAt);

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: reservation.user.email,
    subject: "Tu turno en la barberia esta confirmado",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#181818">
        <h1>Turno confirmado</h1>
        <p>Hola ${reservation.user.name ?? ""}, tu reserva fue aprobada.</p>
        <p><strong>Barbero:</strong> ${reservation.barber.name}</p>
        <p><strong>Fecha:</strong> ${date}</p>
        <p>Te esperamos.</p>
      </div>
    `
  });
}

export async function sendPasswordResetEmail(input: { email: string; name: string | null; resetUrl: string }) {
  const transporter = createMailTransporter();

  if (!transporter) {
    console.warn("SMTP no configurado. Se omite email de cambio de contrasena.");
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: input.email,
    subject: "Cambio de contrasena",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#181818">
        <h1>Cambio de contrasena</h1>
        <p>Hola ${input.name ?? ""}, recibimos una solicitud para cambiar tu contrasena.</p>
        <p>Usa este link para crear una nueva contrasena. El link vence en 30 minutos y solo puede usarse una vez.</p>
        <p><a href="${input.resetUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 16px;border-radius:8px;text-decoration:none">Cambiar contrasena</a></p>
        <p>Si no pediste este cambio, podes ignorar este email.</p>
      </div>
    `
  });
}
