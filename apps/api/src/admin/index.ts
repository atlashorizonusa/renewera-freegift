import { Hono } from "hono";
import type { Env, GiftRequest, GiftStatus } from "../types";
import { Supabase } from "../lib/supabase";
import { getAdminUser } from "../lib/admin_auth";
import { adminLayout, escapeHtml } from "./layout";

type Vars = { adminUser: string };

const app = new Hono<{ Bindings: Env; Variables: Vars }>();

// ── Auth gate for every admin route ──────────────────────────────
app.use("*", async (c, next) => {
  const user = getAdminUser(c);
  if (!user) {
    return c.body("Unauthorized", 401, {
      "WWW-Authenticate": 'Basic realm="Renewera Admin"',
    });
  }
  c.set("adminUser", user);
  await next();
});

// ── Dashboard ────────────────────────────────────────────────────
app.get("/", async (c) => {
  const db = new Supabase(c.env);
  const rows = await db.selectMany<GiftRequest>(
    "gift_requests",
    "select=status,claim_email_failed,shipping_email_failed,delivery_email_failed,created_at",
  );

  const by = (s: GiftStatus) => rows.filter((r) => r.status === s).length;
  const emailFails = rows.filter(
    (r) => r.claim_email_failed || r.shipping_email_failed || r.delivery_email_failed,
  ).length;

  const claimed = by("ready_to_ship") + by("shipped") + by("delivered");
  const submitted = by("submitted") + claimed;
  const convRate = submitted > 0 ? Math.round((claimed / submitted) * 100) : 0;

  const card = (num: number | string, lbl: string, warn = false) =>
    `<div class="card${warn ? " warn" : ""}"><div class="num">${num}</div><div class="lbl">${lbl}</div></div>`;

  const body = `
    <div class="page-head">
      <h1>Dashboard</h1>
      <span class="env-badge env-${c.env.ENVIRONMENT}">${c.env.ENVIRONMENT}</span>
    </div>
    <div class="cards">
      ${card(rows.length, "Total")}
      ${card(by("new"), "New (available)")}
      ${card(by("submitted"), "Submitted")}
      ${card(by("ready_to_ship"), "Ready to ship")}
      ${card(by("shipped"), "Shipped")}
      ${card(by("delivered"), "Delivered")}
    </div>
    <div class="cards">
      ${card(`${convRate}%`, "Claim conversion")}
      ${card(emailFails, "Email failures", emailFails > 0)}
    </div>
  `;

  return c.html(
    adminLayout({ title: "Dashboard", active: "dashboard", user: c.get("adminUser"), body }),
  );
});

// ── Orders list (read-only for now) ──────────────────────────────
app.get("/orders", async (c) => {
  const db = new Supabase(c.env);
  const filter = c.req.query("status");
  const where =
    filter && filter !== "all" ? `&status=eq.${encodeURIComponent(filter)}` : "";
  const rows = await db.selectMany<GiftRequest>(
    "gift_requests",
    `select=*&order=created_at.desc${where}`,
  );

  const statuses: (GiftStatus | "all")[] = [
    "all",
    "new",
    "submitted",
    "ready_to_ship",
    "shipped",
    "delivered",
  ];
  const tabs = statuses
    .map((s) => {
      const on = (filter || "all") === s;
      return `<a href="/admin/orders${s === "all" ? "" : `?status=${s}`}" class="nav-pill${on ? " on" : ""}">${s.replace(/_/g, " ")}</a>`;
    })
    .join(" ");

  const rowsHtml = rows.length
    ? rows
        .map(
          (r) => `<tr>
        <td><code>${escapeHtml(r.amazon_order_number)}</code></td>
        <td><span class="status st-${r.status}">${r.status.replace(/_/g, " ")}</span></td>
        <td>${escapeHtml(r.full_name) || '<span class="muted">—</span>'}</td>
        <td>${escapeHtml(r.email) || '<span class="muted">—</span>'}</td>
        <td>${r.shipping_city ? escapeHtml(`${r.shipping_city}, ${r.shipping_state ?? ""}`) : '<span class="muted">—</span>'}</td>
        <td>${r.tracking_number ? `<code>${escapeHtml(r.tracking_number)}</code>` : '<span class="muted">—</span>'}</td>
        <td class="muted">${fmtDate(r.created_at)}</td>
      </tr>`,
        )
        .join("")
    : `<tr><td colspan="7"><div class="empty">No orders${filter && filter !== "all" ? ` with status “${escapeHtml(filter)}”` : ""}.</div></td></tr>`;

  const body = `
    <div class="page-head">
      <h1>Orders</h1>
      <span class="env-badge env-${c.env.ENVIRONMENT}">${c.env.ENVIRONMENT}</span>
    </div>
    <div style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap;">${tabs}</div>
    <table>
      <thead><tr>
        <th>Order #</th><th>Status</th><th>Name</th><th>Email</th>
        <th>Location</th><th>Tracking</th><th>Created</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <style>
      .nav-pill{display:inline-block;padding:5px 12px;border-radius:999px;background:#fff;border:1px solid #e5e7eb;color:#374151;text-decoration:none;font-size:12px;font-weight:500;text-transform:capitalize;}
      .nav-pill.on{background:#1a1d23;color:#fff;border-color:#1a1d23;}
    </style>
  `;

  return c.html(
    adminLayout({ title: "Orders", active: "orders", user: c.get("adminUser"), body }),
  );
});

// ── Placeholder pages (built in later phases) ────────────────────
app.get("/inventory", (c) =>
  c.html(
    adminLayout({
      title: "Inventory",
      active: "inventory",
      user: c.get("adminUser"),
      body: `<div class="page-head"><h1>Inventory</h1><span class="env-badge env-${c.env.ENVIRONMENT}">${c.env.ENVIRONMENT}</span></div><div class="empty">Bulk order-number loading — coming in the next step.</div>`,
    }),
  ),
);

app.get("/content", (c) =>
  c.html(
    adminLayout({
      title: "Content",
      active: "content",
      user: c.get("adminUser"),
      body: `<div class="page-head"><h1>Content</h1><span class="env-badge env-${c.env.ENVIRONMENT}">${c.env.ENVIRONMENT}</span></div><div class="empty">Product & page editing — coming in a later phase.</div>`,
    }),
  ),
);

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default app;
