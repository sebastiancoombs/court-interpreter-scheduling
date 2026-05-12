# LOCAL DEV ONLY — standalone Vue + nginx for frontend-only iteration.
# Production / Railway uses Dockerfile.unified at the repo root, which
# bundles Vue + FastAPI + EA in a single container. Do NOT use this file
# as a Railway build target; it will drift from the unified stack.

FROM node:18-bookworm AS build
WORKDIR /app
# OpenSSL 3.0 (Node 17+) breaks the old webpack 4 + terser bundle
# bcgov ships. `--openssl-legacy-provider` restores the v1.1 algorithms
# the bundler still calls into.
ENV NODE_OPTIONS=--openssl-legacy-provider \
    VUE_APP_RUN_IN_DOCKER=true \
    WEB_BASE_HREF=/
COPY package*.json ./
# `--legacy-peer-deps` because the bcgov package.json predates npm's
# stricter peer-dep resolver. Fallback to `npm install` if `npm ci` errors
# on the lockfile (some bcgov forks ship without a matching lockfile).
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps
COPY . .
# vue-cli-service ships with eslint by default; bcgov source has known
# lint warnings that block `build` under strict CI. Skip the lint plugin
# on retry so a known-warning codebase still produces dist/.
RUN npm run build || npm run build -- --skip-plugins lint

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
# Ship the config as a template; the CMD fills in __RESOLVER__ at
# runtime from /etc/resolv.conf. We use sed (not envsubst) so nginx's
# own $-variables ($uri, $host, etc.) are never touched.
COPY default.conf /etc/nginx/conf.d/default.conf.tpl
EXPOSE 80
CMD ["sh", "-c", "R=$(awk '/^nameserver/{print $2; exit}' /etc/resolv.conf); echo \"$R\" | grep -q ':' && R=\"[$R]\"; sed \"s/__RESOLVER__/$R/g\" /etc/nginx/conf.d/default.conf.tpl > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
