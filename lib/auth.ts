import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin as adminPlugin, username as usernamePlugin } from "better-auth/plugins";
import { prismadb } from "@/lib/prisma";
import { ac, admin, member, viewer } from "@/lib/auth-permissions";
import { newUserNotify } from "@/lib/new-user-notify";

const isDemo = process.env.NEXT_PUBLIC_APP_URL === "https://demo.nextcrm.io";

const BETTER_AUTH_SECRET_PLACEHOLDERS = new Set([
  "",
  "build-time-placeholder-secret-replace-at-runtime",
  "generate-with-openssl-rand-base64-32",
]);

/** Как в vercel.json `build.env` — на Vercel `collectPageData` иногда без `SKIP_ENV_VALIDATION`. */
const VERCEL_JSON_BUILD_PLACEHOLDER = "build-time-placeholder-secret-replace-at-runtime";

/** Только для `next build`: в vercel.json / Dockerfile на сборку — SKIP_ENV_VALIDATION=1 и плейсхолдер секрета. */
const BUILD_TIME_BETTER_AUTH_SECRET = `build-only-better-auth-secret-${"0".repeat(48)}`;

function isNextProductionOrDevelopmentBuild(): boolean {
  const phase = process.env.NEXT_PHASE;
  return phase === "phase-production-build" || phase === "phase-development-build";
}

/** Секрет сессий: в проде в рантайме нужен свой секрет ≥32 символов. */
function resolveBetterAuthSecret(): string {
  const raw = process.env.BETTER_AUTH_SECRET?.trim();
  if (raw && !BETTER_AUTH_SECRET_PLACEHOLDERS.has(raw) && raw.length >= 32) {
    return raw;
  }
  if (
    process.env.SKIP_ENV_VALIDATION === "1" ||
    isNextProductionOrDevelopmentBuild()
  ) {
    return BUILD_TIME_BETTER_AUTH_SECRET;
  }
  // `next build` (в т.ч. collectPageData) часто с NODE_ENV=production без VERCEL=1 — только такой плейсхолдер из vercel.json.
  if (raw === VERCEL_JSON_BUILD_PLACEHOLDER) {
    return BUILD_TIME_BETTER_AUTH_SECRET;
  }
  const mustConfigure = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  if (mustConfigure) {
    throw new Error(
      "BETTER_AUTH_SECRET: задай в Vercel (Production) строку ≥32 символов, не плейсхолдер из vercel.json. Как сгенерировать — в чате у ассистента, не в файлах."
    );
  }
  return `local-dev-better-auth-${"x".repeat(48)}`;
}

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
    allowedHosts: Array.from(hosts),
    protocol: "https",
    fallback,
  };
}

export const auth = betterAuth({
  database: prismaAdapter(prismadb, { provider: "postgresql" }),
  secret: resolveBetterAuthSecret(),
  baseURL: resolveBetterAuthBaseURL(),

  /** Вход только по логину (`/sign-in/username`). Регистрация по-прежнему через `/sign-up/email` с внутренним placeholder-email (требование username-плагина Better Auth). */
  disabledPaths: ["/sign-in/email"],

  onAPIError: {
    onError(error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : "";
      console.error("[better-auth] API error:", msg, stack?.slice(0, 2500));
    },
  },

  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          const id =
            createdUser && typeof createdUser === "object" && "id" in createdUser
              ? String((createdUser as { id: string }).id)
              : "";
          if (!id) return;
          try {
            const count = await prismadb.users.count();
            if (count === 1) {
              await prismadb.users.update({
                where: { id },
                data: { role: "admin", userStatus: "ACTIVE" },
              });
            } else if (!isDemo) {
              const dbUser = await prismadb.users.findUnique({ where: { id } });
              if (dbUser) {
                try {
                  await newUserNotify(dbUser);
                } catch {
                  /* уведомление админам не должно ломать регистрацию */
                }
              }
            }
          } catch (e) {
            console.error("[auth] databaseHooks.user.create.after:", e);
          }
        },
      },
    },
  },

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
    requireEmailVerification: false,
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
});

export type Session = typeof auth.$Infer.Session;
