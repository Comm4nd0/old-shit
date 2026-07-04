# Deploying Old Shit on luma001

The stack follows the one-compose-per-app pattern: two containers (Django API
behind gunicorn, and a small internal Caddy that serves the web build + media
and routes `/api`), publishing **one port on 127.0.0.1**. luma001's main Caddy
just reverse-proxies a subdomain to that port and handles TLS.

```
internet ──> main Caddy (TLS, oldshit.<domain>)
                └─> 127.0.0.1:8020  (this stack's proxy container)
                       ├─ /api/*, /admin/*  ──> api container (gunicorn :8000)
                       ├─ /media/*, /static/* ── shared volumes (file_server)
                       └─ everything else ───── Expo web build
```

## 1. On luma001

```bash
git clone https://github.com/Comm4nd0/old-shit.git /opt/old-shit   # or wherever apps live
cd /opt/old-shit
cp .env.example .env
# edit .env: set DJANGO_SECRET_KEY (generate one), OLDSHIT_HOST, and
# OLDSHIT_PORT if 8020 collides with another app
docker compose up -d --build
curl -s http://127.0.0.1:8020/api/sites/ | head -c 200   # sanity check
```

First boot runs migrations, seeds the 55 curated sites, and collects static
files automatically. For an admin user:
`docker compose exec api python manage.py createsuperuser`

## 2. Main Caddyfile

Add the block from `deploy/luma001.Caddyfile` (subdomain → `127.0.0.1:8020`),
create the DNS record for the subdomain, and reload Caddy. If the main Caddy
runs in Docker rather than on the host, see the comments in that file.

## 3. Point the mobile app at it

Native builds bake the API URL at build time:

```bash
cd mobile
EXPO_PUBLIC_API_URL=https://oldshit.<domain> npx expo start   # dev / Expo Go
```

The web build served by the stack needs nothing — it is compiled with
`EXPO_PUBLIC_API_URL=/` and talks to the API on its own origin.

## Operations

- **Update:** `git pull && docker compose up -d --build`
- **Logs:** `docker compose logs -f api` (Wikipedia fetch warnings land here)
- **Data:** SQLite DB lives in the `oldshit_db-data` volume, uploaded photos
  in `oldshit_media`. Back up with `docker run --rm -v oldshit_db-data:/d -v $PWD:/out alpine cp /d/db.sqlite3 /out/`
- **Wikipedia:** outbound calls go to en.wikipedia.org over HTTPS; if luma001
  egress-filters, allow that host. Outages degrade gracefully to curated data.
