import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin as adminPlugin } from "better-auth/plugins";
import { prismadb } from "@/lib/prisma";
import { ac, admin, member, viewer } from "@/lib/auth-permissions";
import { newUserNotify } from "@/lib/new-user-notify";

const isDemo = process.env.NEXT_PUBLIC_APP_URL === "https://demo.nextcrm.io";

export const auth = betterAuth({
  database: prismaAdapter(prismadb, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
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
          await newUserNotify(dbUser);
        }
      }
    },
  },
});

export type Session = typeof auth.$Infer.Session;
