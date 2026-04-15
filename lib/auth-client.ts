import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { ac, admin, member, viewer } from "@/lib/auth-permissions";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    adminClient({
      ac,
      roles: { admin, member, viewer },
    }),
  ],
});

export const { signIn, signOut, useSession } = authClient;
