// Shared HTML shell for admin pages. Template-literal HTML to match the
// existing no-framework approach (same style as the email templates).

export interface LayoutOpts {
  title: string;
  active: "dashboard" | "orders" | "inventory" | "content";
  user: string;
  body: string;
}

const NAV: { key: LayoutOpts["active"]; label: string; href: string }[] = [
  { key: "dashboard", label: "Dashboard", href: "/admin" },
  { key: "orders", label: "Orders", href: "/admin/orders" },
  { key: "inventory", label: "Inventory", href: "/admin/inventory" },
  { key: "content", label: "Content", href: "/admin/content" },
];

export function adminLayout(o: LayoutOpts): string {
  const nav = NAV.map(
    (n) =>
      `<a href="${n.href}" class="nav-item${n.key === o.active ? " active" : ""}">${n.label}</a>`,
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>${o.title} · Renewera Admin</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f6f7f9;color:#1a1a1a;font-size:14px;line-height:1.5;}
    .shell{display:grid;grid-template-columns:220px 1fr;min-height:100vh;}
    .sidebar{background:#1a1d23;color:#c9ced6;padding:24px 0;display:flex;flex-direction:column;}
    .brand{padding:0 24px 24px;font-size:16px;font-weight:700;letter-spacing:0.04em;color:#fff;border-bottom:1px solid #2c3038;margin-bottom:16px;}
    .brand small{display:block;font-size:11px;font-weight:500;letter-spacing:0.12em;color:#6b7280;text-transform:uppercase;margin-top:4px;}
    .nav-item{display:block;padding:11px 24px;color:#c9ced6;text-decoration:none;font-weight:500;border-left:3px solid transparent;}
    .nav-item:hover{background:#23272f;color:#fff;}
    .nav-item.active{background:#23272f;color:#fff;border-left-color:#e28a5c;}
    .sidebar-foot{margin-top:auto;padding:16px 24px;font-size:12px;color:#6b7280;border-top:1px solid #2c3038;}
    .main{padding:32px 40px;overflow-x:auto;}
    .page-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;}
    .page-head h1{font-size:22px;font-weight:600;}
    .env-badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;}
    .env-staging{background:#fde68a;color:#92400e;}
    .env-production{background:#bbf7d0;color:#166534;}
    .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px;margin-bottom:32px;}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;}
    .card .num{font-size:28px;font-weight:700;line-height:1;}
    .card .lbl{font-size:12px;color:#6b7280;margin-top:6px;text-transform:uppercase;letter-spacing:0.04em;}
    .card.warn .num{color:#dc2626;}
    table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;}
    th,td{text-align:left;padding:11px 14px;border-bottom:1px solid #f0f1f3;font-size:13px;vertical-align:top;}
    th{background:#fafafa;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;font-weight:600;}
    tr:last-child td{border-bottom:none;}
    .status{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:600;text-transform:capitalize;}
    .st-new{background:#e5e7eb;color:#374151;}
    .st-submitted{background:#dbeafe;color:#1e40af;}
    .st-ready_to_ship{background:#fef3c7;color:#92400e;}
    .st-shipped{background:#e0e7ff;color:#3730a3;}
    .st-delivered{background:#bbf7d0;color:#166534;}
    .muted{color:#9ca3af;}
    code{font-family:'Courier New',monospace;font-size:12px;background:#f3f4f6;padding:1px 5px;border-radius:4px;}
    .empty{padding:48px;text-align:center;color:#9ca3af;}
  </style>
</head>
<body>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">RENEWERA<small>Admin</small></div>
      <nav>${nav}</nav>
      <div class="sidebar-foot">Signed in as<br><strong>${escapeHtml(o.user)}</strong></div>
    </aside>
    <main class="main">
      ${o.body}
    </main>
  </div>
</body>
</html>`;
}

export function escapeHtml(s: string | null | undefined): string {
  if (s == null) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
