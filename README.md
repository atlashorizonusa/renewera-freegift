# Renewera Free Gift — Static Pages

Hosted on Cloudflare Pages. Served at:

- Form: `https://renewera.co/freegift`
- Claim: `https://renewera.co/freegift/claim?token=...`

## Structure

```
/freegift/index.html         ← gift request form (customer scans QR, lands here)
/freegift/claim/index.html   ← shipping/claim page (customer clicks email link)
/_redirects                  ← Cloudflare Pages: root path → /freegift
```

## Editing

These files are generated from source in the VPS project folder:
`~/.openclaw/workspace/projects/Renewera-Free-Gift-Workflows/`

## Configuration placeholders (fill before deployment works)

- `YOUR_TURNSTILE_SITE_KEY` (freegift/index.html) — Cloudflare Turnstile site key
- `YOUR_N8N_WEBHOOK_URL_FOR_SUBMISSION` (freegift/index.html) — n8n webhook URL
- `YOUR_N8N_WEBHOOK_URL_FOR_VERIFY` (freegift/claim/index.html) — n8n webhook URL
- `YOUR_N8N_WEBHOOK_URL_FOR_CLAIM` (freegift/claim/index.html) — n8n webhook URL
