export const ORDER_RE = /^\d{3}-\d{7}-\d{7}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const ZIP_RE = /^\d{5}(-\d{4})?$/;

export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "throwaway.email",
  "yopmail.com",
]);

export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  return DISPOSABLE_EMAIL_DOMAINS.has(email.slice(at + 1).toLowerCase());
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("CF-Connecting-IP") ??
    (req.headers.get("X-Forwarded-For") ?? "").split(",")[0]?.trim() ??
    ""
  );
}
