# Deploy en Vercel

Esta guia separa lo que ya quedo configurado en el proyecto de lo que tenes que obtener desde tus cuentas.

## Ya configurado en el proyecto

- `vercel.json`: Vercel detecta el proyecto como Next.js y ejecuta `npm run vercel-build`.
- `.vercelignore`: evita subir `.env`, caches locales, `node_modules`, builds locales y uploads temporales.
- `package.json`: fija Node.js 20 en Vercel.
- `npm run vercel-build`: genera Prisma Client y compila Next.js.
- `npm run db:migrate:deploy`: aplica migraciones en una base de produccion.
- `.env.production.example`: plantilla de variables para cargar en Vercel.

## Lo que tenes que conseguir

### 1. Cuenta y proyecto de Vercel

Podes tener mas de un proyecto en una misma cuenta de Vercel mientras no hayas llegado al limite de tu plan.

Para desplegar:

1. Entrar a Vercel.
2. Ir a `Add New...` > `Project`.
3. Importar el repositorio de GitHub.
4. Framework Preset: `Next.js`.
5. Build Command: deberia tomar `npm run vercel-build` desde `vercel.json`.
6. Antes del primer deploy, cargar las variables de entorno.

Si usas la CLI:

```bash
npm install -g vercel
npm install
vercel login
vercel link
vercel
vercel --prod
```

La CLI te va a pedir iniciar sesion y vincular el proyecto. Eso crea una carpeta local `.vercel/` con datos de tu cuenta; esa carpeta no debe subirse al repo.

Una vez que exista `.vercel/`, podes subir a Vercel las variables ya cargadas en tu `.env` local con:

```bash
npm run vercel:env:push
```

El script no sube valores locales que romperian produccion:

- `DATABASE_URL` si apunta a `localhost`.
- `NEXTAUTH_URL` si apunta a `http://localhost:3000`.
- `NEXT_PUBLIC_APP_URL` si apunta a `http://localhost:3000`.

Esos tres valores deben cargarse con datos reales de produccion.

Cuando tengas la URL real de Vercel y la URL de PostgreSQL online, podes cargar las tres variables pendientes con:

```powershell
npm run vercel:env:core -- -AppUrl "https://tu-proyecto.vercel.app" -DatabaseUrl "postgresql://usuario:password@host-online-pooler:5432/barbershop?schema=public&sslmode=verify-full" -DatabaseUrlUnpooled "postgresql://usuario:password@host-online-directo:5432/barbershop?schema=public&sslmode=verify-full"
```

### 2. Base PostgreSQL online

No sirve usar:

```env
DATABASE_URL="postgresql://postgres:admin@localhost:5432/barbershop?schema=public"
```

`localhost` solo existe en tu PC. En Vercel necesitas una URL de una base online, por ejemplo Neon, Supabase, Vercel Postgres o Prisma Postgres.

El valor final se ve parecido a esto:

```env
DATABASE_URL="postgresql://usuario:password@host-online:5432/barbershop?schema=public"
```

Despues de cargar esa variable en Vercel, aplica migraciones:

```bash
npm run db:migrate:deploy
```

Ese comando debe ejecutarse con `DATABASE_URL` apuntando a la base online.

En PowerShell, si queres aplicar migraciones desde tu PC sin modificar `.env`, podes hacerlo asi:

```powershell
$env:DATABASE_URL="postgresql://usuario:password@host-online:5432/barbershop?schema=public"
npm run db:migrate:deploy
Remove-Item Env:\DATABASE_URL
```

### 3. Variables de entorno para Vercel

Cargar estas variables en `Project Settings` > `Environment Variables`, al menos para `Production`:

```env
DATABASE_URL=""
NEXTAUTH_URL="https://tu-proyecto.vercel.app"
NEXTAUTH_SECRET=""

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

MERCADO_PAGO_PUBLIC_KEY=""
MERCADO_PAGO_ACCESS_TOKEN=""
MERCADO_PAGO_WEBHOOK_SECRET=""
NEXT_PUBLIC_APP_URL="https://tu-proyecto.vercel.app"

SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="Barberia <turnos@tudominio.com>"

OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5-mini"

NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL=""
```

No cargues comillas si usas el formulario de Vercel. Las comillas son solo para archivos `.env`.

### 4. NEXTAUTH_SECRET

Generar un secreto largo y unico.

En PowerShell:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

Usa ese resultado en:

```env
NEXTAUTH_SECRET="resultado-generado"
```

### 5. Google OAuth

Cuando Vercel te de la URL final, entra a Google Cloud y agrega:

```txt
https://tu-proyecto.vercel.app/api/auth/callback/google
```

Tambien deja el callback local si vas a seguir desarrollando:

```txt
http://localhost:3000/api/auth/callback/google
```

Despues copia en Vercel:

```env
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

### 6. Mercado Pago

En Mercado Pago Developers, usa la aplicacion real o de prueba segun corresponda.

En Vercel carga:

```env
MERCADO_PAGO_PUBLIC_KEY="tu-public-key"
MERCADO_PAGO_ACCESS_TOKEN="tu-access-token"
MERCADO_PAGO_WEBHOOK_SECRET="tu-webhook-secret"
```

Configura el webhook:

```txt
https://tu-proyecto.vercel.app/api/payments/webhook
```

### 7. Email SMTP

Necesitas un proveedor SMTP. Puede ser Gmail con app password, Brevo, Resend SMTP, Mailgun, SendGrid u otro.

Cargar:

```env
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="Barberia <turnos@tudominio.com>"
```

Si todavia no tenes dominio propio, podes usar un remitente verificado por tu proveedor SMTP.

### 8. OpenAI

Cargar:

```env
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5-mini"
```

Recordatorio: ChatGPT Plus/Premium no es lo mismo que saldo de API. Para que el chat IA funcione, tu cuenta de plataforma OpenAI necesita credito o billing activo.

## Despues del deploy

1. Abrir la URL final.
2. Probar registro/login.
3. Probar login con Google.
4. Entrar como admin.
5. Crear o verificar barberos y horarios.
6. Probar una reserva.
7. Confirmar que el webhook de Mercado Pago llega.
8. Confirmar que se envia el email.
9. Probar el chat IA desde el dashboard admin.

## Valores que no puedo obtener por vos

- URL final de Vercel: aparece despues de crear el proyecto/deploy.
- `DATABASE_URL` online: la da el proveedor de base de datos.
- `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`: los crea Vercel al vincular con `vercel link`; normalmente no los necesitas manualmente.
- Secretos de Google, Mercado Pago, SMTP y OpenAI: salen de tus paneles privados.
- Dominio propio: si queres usar uno, se configura desde Vercel despues del deploy.
