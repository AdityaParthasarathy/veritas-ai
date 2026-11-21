# VERITAS AI frontend: build the static site, then serve it with unprivileged nginx.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# The bundle calls /api/v1 on its own origin; nginx proxies that path to the backend, so nothing is compiled in.
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
# nginx.conf.template serves the static site and proxies /api/ to the "backend" service (docker-compose.yml).
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
