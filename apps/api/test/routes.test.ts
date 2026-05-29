// Lightweight black-box tests for the Hono app. They exercise the
// auth + validation surface without touching Supabase by stubbing
// global.fetch. Full end-to-end paths (DB writes, email sends) are
// covered by the staging smoke test plan in README.md.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import app from "../src/index";
import type { Env } from "../src/types";

const env: Env = {
  TELEGRAM_CHAT_ID: "-1",
  RESEND_FROM: "test@example.com",
  CLAIM_LINK_BASE: "https://renewera.co/freegift/claim",
  TURNSTILE_SITEKEY: "sitekey",
  ENVIRONMENT: "staging",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role",
  SUPABASE_WEBHOOK_SECRET: "right-secret",
  RESEND_API_KEY: "re_test",
  TURNSTILE_SECRET_KEY: "ts_test",
  TELEGRAM_BOT_TOKEN: "123:abc",
};

const ctx = {
  waitUntil: (_p: Promise<unknown>) => {},
  passThroughOnException: () => {},
} as unknown as ExecutionContext;

describe("GET /api/health", () => {
  it("returns ok", async () => {
    const res = await app.fetch(new Request("https://x/api/health"), env, ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, env: "staging" });
  });
});

describe("POST /api/freegift/submit — validation", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("rejects bad order format without hitting any backend", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const res = await app.fetch(
      new Request("https://x/api/freegift/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: "Alice",
          email: "a@example.com",
          amazonOrderNumber: "bogus",
          turnstileToken: "tok",
        }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, error: "INVALID_ORDER_FORMAT" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects disposable emails", async () => {
    const res = await app.fetch(
      new Request("https://x/api/freegift/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fullName: "Alice",
          email: "a@mailinator.com",
          amazonOrderNumber: "123-4567890-1234567",
          turnstileToken: "tok",
        }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, error: "DISPOSABLE_EMAIL" });
  });
});

describe("POST /api/internal/shipped — auth", () => {
  it("rejects requests missing the webhook secret", async () => {
    const res = await app.fetch(
      new Request("https://x/api/internal/shipped", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ record: { id: "x" } }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(401);
  });

  it("rejects requests with the wrong secret", async () => {
    const res = await app.fetch(
      new Request("https://x/api/internal/shipped", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-webhook-secret": "wrong-secret",
        },
        body: JSON.stringify({ record: { id: "x" } }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(401);
  });
});
