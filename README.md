# Barber Studio

Aplicación web full-stack para una barbería con turnero online, login por email/contraseña, login con Google, roles de usuario/admin, pagos con Mercado Pago y confirmación de reserva por email.

## Stack elegido

- **Next.js + TypeScript**: frontend y backend en un mismo proyecto, con rutas API y renderizado moderno.
- **PostgreSQL + Prisma**: base relacional clara para usuarios, barberos, disponibilidad, reservas, pagos, fotos y reseñas.
- **NextAuth/Auth.js**: sesiones seguras, credenciales y Google OAuth.
- **Mercado Pago Checkout Pro**: se crea una preferencia y la reserva se confirma solo desde el webhook cuando el pago queda aprobado.
- **Nodemailer SMTP**: envío automático de email de confirmación.
- **Docker Compose**: base de datos local reproducible.

## Arquitectura

```txt
src/app                Pantallas y rutas API
src/components         Componentes de interfaz
src/lib                Prisma, auth y validaciones
src/server             Lógica de negocio: reservas, pagos y email
prisma                 Modelo de datos y seed inicial
public/uploads         Fotos cargadas por el administrador
```

## Requisitos

- Node.js 20 o superior
- Docker Desktop
- Cuenta de Mercado Pago Developers
- Credenciales OAuth de Google
- Cuenta SMTP para enviar emails

## Configuración local

1. Instalá dependencias:

```bash
npm install
```

2. Copiá variables de entorno:

```bash
cp .env.example .env
```

3. Completá `.env`:

```env
NEXTAUTH_SECRET="un-secreto-largo"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
MERCADO_PAGO_ACCESS_TOKEN="..."
SMTP_HOST="..."
SMTP_USER="..."
SMTP_PASS="..."
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL="url-embed-real-de-google-maps"
```

4. Levantá PostgreSQL:

```bash
docker compose up -d
```

5. Migrá y cargá datos iniciales:

```bash
npm run db:migrate
npm run db:seed
```

6. Ejecutá la app:

```bash
npm run dev
```

La app queda disponible en `http://localhost:3000`.

## Si aparece un error de Prisma en localhost

Si ves `Authentication failed against database server at localhost`, PostgreSQL esta activo pero las credenciales de `DATABASE_URL` no coinciden con tu instalacion local.

Opciones:

- Levantar la base incluida con Docker: `docker compose up -d`.
- Cambiar `DATABASE_URL` en `.env` para que use tu usuario, contraseña, host, puerto y base real.
- Despues ejecutar `npm run db:migrate` y `npm run db:seed`.

La landing muestra datos demo si la base todavia no esta lista, pero login, turnos, reservas y admin necesitan una base conectada.

En desarrollo, si la base no esta disponible, el usuario `admin@barberstudio.com` con contraseña `Admin12345` puede entrar en modo demo. Ese modo permite navegar `/admin` y `/agendar`, pero las altas, ediciones, reservas y pagos no se guardan hasta conectar PostgreSQL correctamente.

## Usuario administrador inicial

```txt
Email: admin@barberstudio.com
Contraseña: Admin12345
```

## Flujo de reserva

1. El usuario se registra o ingresa con Google.
2. Elige barbero.
3. Selecciona un horario disponible.
4. Se crea una reserva en estado `PENDING_PAYMENT`.
5. Se redirige a Mercado Pago.
6. El webhook consulta el pago y, si está aprobado, marca la reserva como `CONFIRMED`.
7. Se envía email automático al usuario.

## Panel administrador

Desde `/admin` se puede:

- Crear, editar y eliminar barberos.
- Cargar fotos de barbería, cortes y barberos.
- Configurar días y horarios disponibles.
- Marcar horarios como no disponibles.
- Crear reservas manuales para usuarios registrados.
- Ver, cambiar estado y eliminar reservas.

Los turnos se generan siempre cada 30 minutos. El admin puede configurar cualquier rango del dia, pero inicio y fin deben terminar en `:00` o `:30`. Si un barbero tiene disponibilidad de `13:00` a `20:00`, la agenda muestra `13:00`, `13:30`, `14:00` y continua hasta `20:00`.

## Notas de seguridad

- Las contraseñas se guardan con `bcrypt`.
- Las rutas administrativas validan sesión y rol `ADMIN`.
- Las credenciales viven en variables de entorno.
- La reserva no queda confirmada por volver desde Mercado Pago, sino por el webhook.
- En producción conviene servir uploads desde almacenamiento externo, por ejemplo S3 o Cloudinary.
