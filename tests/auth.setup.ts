import { test as setup } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../playwright/.auth/user.json");
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || "test@nextcrm.app";
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || "TestPassword123456!";

setup("authenticate", async ({ page, context }) => {
  const api = context.request;

  const signInRes = await api.post("/api/auth/sign-in/email", {
    data: {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      rememberMe: true,
    },
  });
  if (!signInRes.ok()) {
    throw new Error(`sign-in failed: ${signInRes.status()} ${await signInRes.text()}`);
  }

  await page.goto("/en");
  await page.waitForURL(
    (url) =>
      /^\/(en|cs|de|uk|ru)(\/|$)/.test(url.pathname) && !url.pathname.includes("sign-in"),
    { timeout: 15000 }
  );

  await context.storageState({ path: authFile });
});
