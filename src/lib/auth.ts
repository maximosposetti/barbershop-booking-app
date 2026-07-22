import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { AuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { demoAdminUser } from "@/lib/demo-data";
import { prisma } from "@/lib/prisma";

const demoAdminPassword = "Admin12345";
const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith("https://") ?? process.env.NODE_ENV === "production";
const secureCookiePrefix = useSecureCookies ? "__Secure-" : "";

const providers: AuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) return null;

      let user;

      try {
        user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() }
        });
      } catch {
        console.warn("No se pudo conectar con la base de datos durante el login. Se intenta modo demo si corresponde.");
        if (
          process.env.NODE_ENV !== "production" &&
          credentials.email.toLowerCase() === demoAdminUser.email &&
          credentials.password === demoAdminPassword
        ) {
          return {
            id: demoAdminUser.id,
            email: demoAdminUser.email,
            name: demoAdminUser.name,
            image: null,
            role: demoAdminUser.role
          };
        }
        throw new Error("DATABASE_UNAVAILABLE");
      }

      if (!user?.passwordHash) return null;

      const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
      if (!isValid) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role
      };
    }
  })
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
  );
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  useSecureCookies,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7
  },
  cookies: {
    sessionToken: {
      name: `${secureCookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies
      }
    }
  },
  pages: {
    signIn: "/auth/login"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      if (token.email && !token.role) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email },
            select: { id: true, role: true }
          });

          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
          }
        } catch {
          console.warn("No se pudo refrescar el rol de sesion desde la base de datos.");
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }

      return session;
    }
  }
};

export function getCurrentSession() {
  return getServerSession(authOptions);
}

export async function requireAdmin() {
  const session = await getCurrentSession();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("No autorizado");
  }
  return session.user;
}
