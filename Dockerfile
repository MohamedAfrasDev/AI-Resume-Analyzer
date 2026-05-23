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
RUN npm run build
# Result: build/client/  (static SPA — no server bundle because ssr: false)

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 – serve with nginx
#
# Why nginx instead of react-router-serve?
#   This project uses SPA mode (ssr: false in react-router.config.ts), so
#   React Router never emits a build/server/index.js file.
#   react-router-serve expects that file and crashes immediately.
#   nginx serves the static build/client directory and falls back to
#   index.html for every unknown path so client-side routing works correctly.
# ─────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Place the built assets where nginx expects them, under the same subpath
# that Vite was configured with (base: '/AI-Resume-Analyzer/').
COPY --from=builder /app/build/client /usr/share/nginx/html/AI-Resume-Analyzer

# Drop in our custom server config (SPA fallback + caching + security headers)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Remove the default nginx config so ours is the only one loaded
RUN rm -f /etc/nginx/conf.d/default.conf.dpkg-dist 2>/dev/null || true

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
