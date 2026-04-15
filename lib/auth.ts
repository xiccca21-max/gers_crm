import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin as adminPlugin, username as usernamePlugin } from "better-auth/plugins";
import { prismadb } from "@/lib/prisma";
import { ac, admin, member, viewer } from "@/lib/auth-permissions";
import { newUserNotify } from "@/lib/new-user-notify";

const isDemo = process.env.NEXT_PUBLIC_APP_URL === "https://demo.nextcrm.io";

/** Vercel: один деплой открывают с разных host (alias, *.vercel.app). Статический BETTER_AUTH_URL ломает проверку origin/host. */
function resolveBetterAuthBaseURL():
  | string
  | { allowedHosts: string[]; protocol: "https" | "http"; fallback: string } {
  const fromEnv = process.env.BETTER_AUTH_URL?.replace(/\/+$/, "");
  const localhost = "http://localhost:3000";

  if (process.env.VERCEL !== "1") {
    return fromEnv ?? localhost;
  }

  const hosts = new Set<string>(["*.vercel.app"]);
  if (fromEnv) {
    try {
      const host = new URL(fromEnv).host;
      if (host) hosts.add(host);
    } catch {
      /* ignore */
    }
  }
  for (const part of process.env.BETTER_AUTH_ALLOWED_HOSTS?.split(",") ?? []) {
    const h = part.trim();
    if (h) hosts.add(h);
  }

  const fallback =
    fromEnv ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : localhost);

  return {
    allowedHosts: [...hosts],
    protocol: "https",
    fallback,
  };
}

export const auth = betterAuth({
  database: prismaAdapter(prismadb, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: resolveBetterAuthBaseURL(),
  advanced: {
    database: {
      generateId: "uuid",
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh every 24 hours
  },

  user: {
    modelName: "Users",
    fields: {
      createdAt: "created_on",
      updatedAt: "updated_at",
      image: "image",
    },
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "member",
        input: false,
      },
      userStatus: {
        type: "string",
        defaultValue: isDemo ? "ACTIVE" : "PENDING",
        input: false,
      },
      userLanguage: {
        type: "string",
        defaultValue: "ru",
        input: false,
      },
      avatar: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },

  emailAndPassword: {
    enabled: true,
  },

  plugins: [
    usernamePlugin({
      minUsernameLength: 3,
      maxUsernameLength: 32,
    }),
    adminPlugin({
      ac,
      roles: { admin, member, viewer },
      defaultRole: "member",
    }),
  ],

  callbacks: {
    async onUserCreated(user: { id: string }) {
      const count = await prismadb.users.count();
      if (count === 1) {
        await prismadb.users.update({
          where: { id: user.id },
          data: { role: "admin", userStatus: "ACTIVE" },
        });
      } else if (!isDemo) {
        const dbUser = await prismadb.users.findUnique({ where: { id: user.id } });
        if (dbUser) {
          try {
            await newUserNotify(dbUser);
          } catch {
            /* уведомление админам не должно отменять создание пользователя */
          }
        }
      }
    },
  },
});

export type Session = typeof auth.$Infer.Session;
