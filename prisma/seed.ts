import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const passwordHash = await bcrypt.hash("Admin12345", 12);

  await prisma.businessSetting.upsert({
    where: { id: "default" },
    update: { haircutPriceCents: 1500000 },
    create: { id: "default", haircutPriceCents: 1500000 }
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@barberstudio.com" },
    update: {
      name: "Administrador",
      passwordHash,
      role: "ADMIN"
    },
    create: {
      name: "Administrador",
      email: "admin@barberstudio.com",
      passwordHash,
      role: "ADMIN"
    }
  });

  const nico = await prisma.barber.upsert({
    where: { slug: "nico-alvarez" },
    update: {},
    create: {
      name: "Nico Alvarez",
      slug: "nico-alvarez",
      description: "Especialista en fades, barba y terminaciones con navaja.",
      imageUrl: "https://images.unsplash.com/photo-1622296089863-eb7fc530daa8?auto=format&fit=crop&w=900&q=85"
    }
  });

  const tomas = await prisma.barber.upsert({
    where: { slug: "tomas-vera" },
    update: {},
    create: {
      name: "Tomas Vera",
      slug: "tomas-vera",
      description: "Cortes clasicos, tijera y asesoria de estilo personalizada.",
      imageUrl: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=900&q=85"
    }
  });

  await prisma.availabilityRule.deleteMany({
    where: { barberId: { in: [nico.id, tomas.id] } }
  });

  for (const barber of [nico, tomas]) {
    for (const weekday of [2, 3, 4, 5, 6]) {
      await prisma.availabilityRule.create({
        data: {
          barberId: barber.id,
          weekday,
          startTime: "13:00",
          endTime: "20:00",
          slotMinutes: 30
        }
      });
    }
  }

  await prisma.review.deleteMany({
    where: {
      name: { in: ["Martin R.", "Lucas P.", "Santiago G."] }
    }
  });

  await prisma.review.createMany({
    data: [
      { name: "Martin R.", rating: 5, comment: "Excelente atencion, puntuales y el corte quedo impecable." },
      { name: "Lucas P.", rating: 5, comment: "Muy facil reservar. Pague online y me llego la confirmacion al toque." },
      { name: "Santiago G.", rating: 4, comment: "Buen ambiente, buenos productos y barberos con mucha tecnica." }
    ]
  });

  console.log(`Seed completo. Admin: ${admin.email} / Admin12345`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
