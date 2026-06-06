import type { Env } from "../types";

// Minimal context shape this helper needs — a structural type so it works
// with any Hono route regardless of its Variables type.
interface AuthCtx {
  env: Env;
  req: { header(name: string): string | undefined };
}

// Resolve the authenticated admin identity, or null if unauthorized.
//
// Two mechanisms, chosen by environment:
//
//  • production (renewera.co): Cloudflare Access fronts /admin and
//    /api/admin at the edge and injects a verified
//    `Cf-Access-Authenticated-User-Email` header. We trust it ONLY in
//    production, because that's the only place Access guarantees no
//    request reaches the Worker without passing the Access challenge.
//
//  • staging (*.workers.dev) + local dev: Cloudflare Access cannot gate
//    a workers.dev hostname (it's not in a zone you control), so we fall
//    back to HTTP Basic auth against the ADMIN_PASSWORD secret.
//
// Never trust the Access header outside production — on workers.dev anyone
// could send that header directly.
export function getAdminUser(c: AuthCtx): string | null {
  if (c.env.ENVIRONMENT === "production") {
    const email = c.req.header("cf-access-authenticated-user-email");
    return email && email.length > 0 ? email : null;
  }

  // staging + local: password gate via HTTP Basic auth.
  const expected = c.env.ADMIN_PASSWORD;
  if (!expected) return null;

  const header = c.req.header("authorization") ?? "";
  if (!header.startsWith("Basic ")) return null;

  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return null;
  }
  const sep = decoded.indexOf(":");
  if (sep === -1) return null;
  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);

  if (!timingSafeEqualStr(pass, expected)) return null;
  return user || "admin";
}

// Constant-time string comparison to avoid leaking the password length /
// content via response timing.
function timingSafeEqualStr(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i]! ^ bb[i]!;
  return diff === 0;
}
