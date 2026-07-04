# Builds the Expo web app and serves it (plus /api, /media, /static routing)
# behind ONE port, so luma001's main Caddy only needs a single reverse_proxy.
FROM node:22-alpine AS build
WORKDIR /build
COPY mobile/package.json mobile/package-lock.json ./
RUN npm ci
COPY mobile/ .
# "/" = same-origin: the web app calls the API on the domain it is served from.
ENV EXPO_PUBLIC_API_URL=/
RUN npx expo export --platform web

FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /build/dist /srv/web
