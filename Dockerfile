# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 – install ALL dependencies (needed for the build step)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 – build the SPA
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# VITE_BASE_URL defaults to "/" in vite.config.ts — no override needed here.
# Set VITE_BASE_URL=/AI-Resume-Analyzer/ only when building for GitHub Pages.
RUN npm run build
# Result: build/client/  (static SPA — no server bundle because ssr: false)

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 – serve with nginx
#
# Why nginx and not react-router-serve / node?
#   This app uses SPA mode (ssr: false in react-router.config.ts), so React
#   Router never emits a build/server/index.js file. react-router-serve expects
#   that file and crashes on startup. nginx serves the static build/client dir
#   and falls back to index.html for all unknown paths so client-side routing
#   works correctly.
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

COPY --from=builder /app/build/client /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
