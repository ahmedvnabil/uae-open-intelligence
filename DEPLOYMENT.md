# Deployment Guide

The platform is a single Node process with **no native dependencies** and **no build step**. The SQLite database is rebuilt from the committed JSON export at deploy time, so nothing external is required.

## Prerequisites
- **Node ≥ 20** (Node ≥ 22.5 recommended — uses the built-in `node:sqlite`).
- No compiler, no `better-sqlite3`, no Python/`make`.

## 1. Local / bare-metal

```bash
git clone <repo> && cd uae-open-intelligence
npm ci                 # or: npm install
npm run build-db       # builds data/uae.db from data/export/*.json (self-contained)
PORT=3000 npm start    # → http://localhost:3000
```

Use a process manager in production:
```bash
pm2 start "npm start" --name uae-oi   # or systemd, see below
```

### systemd unit (example)
```ini
# /etc/systemd/system/uae-oi.service
[Unit]
Description=UAE Open Intelligence Platform
After=network.target
[Service]
WorkingDirectory=/opt/uae-open-intelligence
Environment=PORT=3000 NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=on-failure
User=www-data
[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl enable --now uae-oi
```

## 2. Docker

```bash
docker build -t uae-oi .
docker run -d -p 3000:3000 --name uae-oi --restart unless-stopped uae-oi
```
The image (Node 22-slim) runs `npm ci` then `npm run build-db` at build time and ships with a `HEALTHCHECK` hitting `/healthz`. Image is stateless — the DB is baked in; no volume needed (data is read-only at runtime).

### docker compose
```yaml
services:
  uae-oi:
    build: .
    ports: ["3000:3000"]
    environment: { PORT: "3000", NODE_ENV: "production" }
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
```

## 3. Coolify / Proxmox (this repo's convention)

This app fits the standard Dockerfile deploy path:
1. Push to the Gitea repo (auto-deploy webhook triggers Coolify).
2. Coolify builds the `Dockerfile` and exposes port **3000**.
3. Live URL pattern: `http://<app-name>.<host>.sslip.io`.

The Dockerfile is preferred over any compose; port `3000` is auto-detected. No env vars are required for a default run.

## Configuration
| Var | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | — | set `production` in prod |

## Reverse proxy (nginx)
```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $remote_addr;   # used by the API rate limiter
  proxy_set_header X-Real-IP $remote_addr;
}
```

## Health & ops
- **Health:** `GET /healthz` → `{ "ok": true, "status": "healthy" }`.
- **Robots:** `GET /robots.txt` (allow-all).
- **Security headers** (CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) are sent by the app — no proxy config needed, but don't strip them.
- **Rate limiting:** 240 req/min/IP on `/api/*` (in-memory; per-instance). Behind a proxy, ensure `X-Forwarded-For` is set.
- **Refreshing data:** edit sources → `npm run seed` (regenerates `data/export/*.json` + DB) → commit the export → redeploy. On a host without the raw sources, `npm run build-db` rebuilds from the committed export.

## Scaling notes
- Stateless and read-only → scale horizontally behind a load balancer; each instance has its own in-memory rate-limit counter.
- The whole dataset is ~600 KB SQLite; queries are O(scan) over ≤106 rows — a single small instance handles substantial traffic.
