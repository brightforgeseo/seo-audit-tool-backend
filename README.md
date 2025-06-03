# SEO Audit Tool

A minimal Node.js backend for basic SEO analysis.

## Endpoints

- `GET /health` — Health check
- `POST /api/analyze` — Analyze a website (body: `{ "url": "https://example.com" }`)

## Deployment

- Use [Render.com](https://render.com)
- Build command: `npm install --production`
- Start command: `node api/audit.js` 