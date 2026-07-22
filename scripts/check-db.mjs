import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL no esta configurada.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

try {
  await prisma.$queryRaw`SELECT 1`;
  const admin = await prisma.user.findUnique({
    where: { email: "admin@barberstudio.com" },
    select: { email: true, role: true, passwordHash: true }
  });

  console.log("Base de datos conectada correctamente.");
  console.log(
    admin
      ? `Admin encontrado: ${admin.email} (${admin.role}), password configurada: ${Boolean(admin.passwordHash)}`
      : "Admin no encontrado. Ejecuta: npm run db:seed"
  );
} catch (error) {
  console.error("No se pudo conectar a la base de datos.");
  console.error("Revisa DATABASE_URL en .env o levanta PostgreSQL con las credenciales esperadas.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
