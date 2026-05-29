import type { Env } from "../types";

export async function sendTelegram(env: Env, markdown: string): Promise<void> {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: markdown,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }),
  });
  // Telegram failures are non-fatal — we still want the main flow to succeed.
  if (!res.ok) console.error(`telegram ${res.status}: ${await res.text()}`);
}
