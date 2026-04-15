import { Users } from "@prisma/client";

import { prismadb } from "./prisma";
import resendHelper from "./resend";

function resolveFromAddress(): string | undefined {
  const a = process.env.EMAIL_FROM?.trim();
  const b = process.env.RESEND_FROM_EMAIL?.trim();
  return a || b || undefined;
}

/** Уведомление админам о новой регистрации — только Resend (без SMTP/nodemailer). */
export async function newUserNotify(newUser: Users) {
  const from = resolveFromAddress();
  if (!from) {
    console.warn("[newUserNotify] skip: задайте EMAIL_FROM или RESEND_FROM_EMAIL");
    return;
  }

  let resend: Awaited<ReturnType<typeof resendHelper>>;
  try {
    resend = await resendHelper();
  } catch (e) {
    console.warn("[newUserNotify] skip: Resend не настроен", e instanceof Error ? e.message : e);
    return;
  }

  const admins = await prismadb.users.findMany({
    where: { role: "admin" },
    select: { email: true },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? "";
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "CRM";
  const who = `${newUser.name ?? ""}${newUser.username ? ` (@${newUser.username})` : ""}`.trim() || newUser.username || "user";
  const adminUsersPath = appUrl ? `${appUrl}/ru/admin/users` : "/ru/admin/users";
  const text = `Новый пользователь (ожидает активации): ${who}\nВнутренний идентификатор в БД: ${newUser.email}\n\nАдминка пользователей: ${adminUsersPath}\n\n${appName}`;

  for (const admin of admins) {
    const to = admin.email?.trim();
    if (!to || /@users\.invalid$/i.test(to)) continue;
    try {
      await resend.emails.send({
        from,
        to,
        subject: "Новая регистрация (ожидает активации)",
        text,
      });
      console.log("[newUserNotify] sent to", to);
    } catch (e) {
      console.error("[newUserNotify] Resend error for", to, e);
    }
  }
}
