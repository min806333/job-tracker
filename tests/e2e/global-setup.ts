import fs from "node:fs/promises";
import path from "node:path";
import { chromium, request, type FullConfig } from "@playwright/test";

const AUTH_DIR = path.join(process.cwd(), "playwright", ".auth");
const AUTH_FILE = path.join(AUTH_DIR, "user.json");

function getCredentials() {
  const email = process.env.TEST_USER_EMAIL ?? "e2e.user.jobtracker@example.com";
  const password = process.env.TEST_USER_PASSWORD ?? "E2E_password_1234!";
  return { email, password };
}

async function ensureTestUser(baseURL: string, email: string, password: string) {
  const api = await request.newContext({ baseURL });
  const res = await api.post("/api/auth/signup", {
    data: { email, password },
    headers: { "Content-Type": "application/json" },
  });
  const body = await res.text();
  await api.dispose();

  // 200: created, 409: already exists
  if (res.status() === 200 || res.status() === 409) return;

  throw new Error(`Failed to ensure test user. status=${res.status()} body=${body}`);
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL;
  if (!baseURL || typeof baseURL !== "string") {
    throw new Error("Missing Playwright baseURL.");
  }

  const { email, password } = getCredentials();
  await ensureTestUser(baseURL, email, password);

  await fs.mkdir(AUTH_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${baseURL}/login`);
  await page.getByTestId("login-email-input").fill(email);
  await page.getByTestId("login-password-input").fill(password);
  await page.getByTestId("login-submit-button").click();

  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
  await page.evaluate(() => {
    window.localStorage.setItem("jt_tutorial_done_v1", "1");
    window.localStorage.setItem("jt_onboarding_dismissed", "1");
    window.localStorage.setItem("onboarding_seen", "1");
  });
  await page.context().storageState({ path: AUTH_FILE });
  await browser.close();
}
