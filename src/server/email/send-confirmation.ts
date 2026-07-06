import nodemailer from "nodemailer";

type ReservationEmail = {
  startAt: Date;
  barber: { name: string };
  user: { email: string; name: string | null };
};

export async function sendReservationConfirmation(reservation: ReservationEmail) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP no configurado. Se omite email de confirmacion.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

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
