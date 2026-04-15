import { createAuthClient } from "better-auth/react";
import { adminClient, usernameClient } from "better-auth/client/plugins";
import { ac, admin, member, viewer } from "@/lib/auth-permissions";

// Не задаём baseURL: на клиенте Better Auth берёт `window.location.origin` —
// иначе при несовпадении NEXT_PUBLIC_APP_URL с реальным host (Vercel alias / preview) падает регистрация.
export const authClient = createAuthClient({
  plugins: [
    usernameClient(),
    adminClient({
      ac,
      roles: { admin, member, viewer },
    }),
  ],
});

export const { signIn, signOut, useSession } = authClient;
