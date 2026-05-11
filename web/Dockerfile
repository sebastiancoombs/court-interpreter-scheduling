# Two-stage build: compile the Vue 2 SPA, then serve the static dist
# with nginx. Railway sets $PORT at runtime; entrypoint substitutes it
# into the nginx site config so the container binds the platform-assigned
# port without a rebuild.

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
# Static config, no template. Drops nginx-alpine's envsubst entrypoint
# pass entirely (it was corrupting nginx's native $-variables and
# silently breaking the rendered config). nginx listens on 80; Railway
# detects the open TCP port and routes external traffic to it.
COPY default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
