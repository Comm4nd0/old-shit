# Old Shit 🏛️

A tourism app that tells you about the old shit in your area. Point it at your location and it
serves up nearby historic sites — ancient, informative, and lightly roasted. Rate them, argue in
the comments, post your photos, and book tickets to go stand next to something older than your
entire family tree.

## How it works

- **Home feed** — uses your GPS to list old shit near you, nearest first. No location? Search
  instead, or browse the greatest hits.
- **Site data** — a curated database of 55 world-famous sites (written with love and mild
  disrespect) blended with live results from Wikipedia's GeoSearch API, so the feed works
  anywhere on Earth. Wikipedia results are cached server-side and clearly badged.
- **Comments, ratings, photos** — sign up with a username and have opinions in public.
- **Social** — check in ("I saw this old shit"), upvote the best takes (the winner becomes
  the site's Top Take), climb the Ruin Enjoyers leaderboard, and show off a profile with
  your combined years of old shit witnessed. Share any site as a link that opens in the
  browser.
- **Tickets** — curated sites link to the real official booking page; everything else gets an
  honest "find tours nearby" search link.

## Repo layout

| Path | What |
|---|---|
| `backend/` | Django 5 + DRF API (SQLite for dev) |
| `mobile/` | Expo React Native app (TypeScript, expo-router) |
| `scripts/smoke.sh` | curl smoke test against a running dev server |

## Backend — run it

```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_sites          # load the curated 55
.venv/bin/python manage.py runserver 0.0.0.0:8000
```

Tests: `.venv/bin/python manage.py test`  ·  Smoke: `./scripts/smoke.sh`

### API

| Route | Auth | What |
|---|---|---|
| `POST /api/auth/register/` `login/` | – | returns `{token, username}` |
| `GET /api/auth/me/` | token | who am I |
| `GET /api/sites/` | – | all sites, best-rated first |
| `GET /api/sites/nearby/?lat=&lng=&radius=` | – | old shit near you (km radius, default 25) |
| `GET /api/sites/search/?q=` | – | search names/cities/countries (+ Wikipedia) |
| `GET /api/sites/<id>/` | – | full detail, photos, your rating, ticket link |
| `GET/POST /api/sites/<id>/comments/` | POST: token | say things |
| `POST /api/sites/<id>/ratings/` | token | `{value: 1-5}`, re-rating updates |
| `GET/POST /api/sites/<id>/photos/` | POST: token | multipart `image` + `caption` |
| `POST/DELETE /api/sites/<id>/visits/` | token | check in / un-check-in |
| `POST /api/comments/<id>/vote/` | token | toggle an upvote |
| `GET /api/activity/` | – | recent check-ins, takes, photos |
| `GET /api/leaderboard/` | – | top ruin enjoyers by visits |
| `GET /api/users/<username>/` | – | public profile + stats |

## Mobile — run it

```bash
cd mobile
npm install
EXPO_PUBLIC_API_URL=http://<your-machines-lan-ip>:8000 npx expo start
```

Scan the QR code with Expo Go. On a physical phone the API URL must be your machine's LAN IP
(not localhost). Typecheck with `npx tsc --noEmit`; a headless build check is
`npx expo export --platform web`.

## Notes

- Wikipedia calls use a descriptive User-Agent (Wikimedia policy), are throttled to one call per
  ~1 km grid cell per hour, and can never take the feed down — outages just mean DB-only results.
- Wiki-sourced descriptions/images are attributed via a badge and link back to the article.
- Dev settings are deliberately permissive (CORS open, `ALLOWED_HOSTS=*`). Don't ship them.
