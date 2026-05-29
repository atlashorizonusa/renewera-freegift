// Minimal Supabase client — direct PostgREST over fetch.
// No SDK dependency (keeps Worker bundle small + cold-start fast).

import type { Env, GiftRequest } from "../types";

type Json = Record<string, unknown>;

export class Supabase {
  private url: string;
  private key: string;

  constructor(env: Env) {
    this.url = env.SUPABASE_URL.replace(/\/$/, "");
    this.key = env.SUPABASE_SERVICE_ROLE_KEY;
  }

  private headers(extra: Record<string, string> = {}): Headers {
    return new Headers({
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      "Content-Type": "application/json",
      ...extra,
    });
  }

  // ── REST table operations ───────────────────────────────────
  async selectOne<T = GiftRequest>(
    table: string,
    query: string,
  ): Promise<T | null> {
    const res = await fetch(`${this.url}/rest/v1/${table}?${query}&limit=1`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`supabase select ${res.status} ${await res.text()}`);
    const rows = (await res.json()) as T[];
    return rows[0] ?? null;
  }

  async selectMany<T = GiftRequest>(
    table: string,
    query: string,
  ): Promise<T[]> {
    const res = await fetch(`${this.url}/rest/v1/${table}?${query}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`supabase select ${res.status} ${await res.text()}`);
    return (await res.json()) as T[];
  }

  async update<T = GiftRequest>(
    table: string,
    query: string,
    patch: Json,
  ): Promise<T[]> {
    const res = await fetch(`${this.url}/rest/v1/${table}?${query}`, {
      method: "PATCH",
      headers: this.headers({ Prefer: "return=representation" }),
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(`supabase update ${res.status} ${await res.text()}`);
    return (await res.json()) as T[];
  }

  // ── RPC (calling Postgres functions) ────────────────────────
  async rpc<T = unknown>(fn: string, args: Json = {}): Promise<T> {
    const res = await fetch(`${this.url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error(`supabase rpc ${fn} ${res.status} ${await res.text()}`);
    return (await res.json()) as T;
  }

  // ── Convenience wrappers used by routes ─────────────────────
  orderStatus(amazonOrderNumber: string) {
    return this.rpc<
      { exists_in_db: boolean; available: boolean; current_status: string | null }[]
    >("order_status", { check_order: amazonOrderNumber });
  }

  emailRateLimited(email: string) {
    return this.rpc<boolean>("email_rate_limited", { check_email: email });
  }

  ipSubmissionCount(ip: string) {
    return this.rpc<number>("ip_submission_count", { check_ip: ip });
  }

  recycleExpired() {
    return this.rpc<{ id: string; amazon_order_number: string; email: string | null }[]>(
      "recycle_expired_submissions",
    );
  }
}
