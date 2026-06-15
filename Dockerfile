# UAE Open Intelligence Platform — production image.
# Uses Node 22 (built-in node:sqlite, no native build). Rebuilds the DB from the
# committed data/export/*.json at build time (no external source folders needed).
FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production PORT=3000

# Install deps (no native modules → fast, reproducible)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# App source + committed data export
COPY . .

# Build the SQLite database from the committed JSON export
RUN npm run build-db

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=4s --start-period=8s \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "start"]
