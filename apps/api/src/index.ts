import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import submit from "./routes/submit";
import verify from "./routes/verify";
import claim from "./routes/claim";
import shipped from "./routes/internal/shipped";
import delivered from "./routes/internal/delivered";
import admin from "./admin";
import { runDailyMaintenance } from "./cron/daily";

const app = new Hono<{ Bindings: Env }>();

// Same-origin in production via the renewera.co/api/* route.
// CORS allows local dev and tooling to hit endpoints from elsewhere.
app.use(
  "/api/*",
  cors({
    origin: ["https://renewera.co", "http://localhost:8788", "http://localhost:8787"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    maxAge: 86400,
  }),
);

app.get("/api/health", (c) =>
  c.json({ ok: true, env: c.env.ENVIRONMENT ?? "unknown" }),
);

app.route("/api/freegift/submit", submit);
app.route("/api/freegift/verify", verify);
app.route("/api/freegift/claim", claim);
app.route("/api/internal/shipped", shipped);
app.route("/api/internal/delivered", delivered);

// Admin panel (HTML). Auth handled inside the router:
// Cloudflare Access in production, password gate on staging/local.
app.route("/admin", admin);

app.notFound((c) => c.json({ error: "not found" }, 404));
app.onError((err, c) => {
  console.error("worker error", err);
  return c.json({ success: false, error: "INTERNAL_ERROR" }, 500);
});

export default {
  fetch: app.fetch,
  // Cloudflare Cron Trigger entry point (cron expression in wrangler.toml).
  scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runDailyMaintenance(env));
  },
} satisfies ExportedHandler<Env>;
