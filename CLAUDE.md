# CLAUDE.md — Old Shit

## What this is

**Old Shit** is a tourism app that helps people find historic sites — "old shit" — near
them, anywhere in the world, and learn something real about each one. The soul of the app
is the tone: **slightly jokey, genuinely informative**. Every site description should make
someone snort *and* teach them a fact interesting enough to repeat at the pub ("huh,
that's cool" is the target reaction). It is a history app that doesn't take itself
seriously, about things that deserve to be taken seriously.

The user opens the app, it grabs their location, and the feed says: here's a 900-year-old
abbey 1.2 km away, here's why it matters, here's the joke, here's the ticket link, and
here's what other visitors said about it. Rate it, argue in the comments, post a photo of
yourself pointing at it.

## The tone (this matters more than any code convention)

- **Informative first, funny second.** A description is 2–4 sentences: at least two true,
  specific facts (dates, numbers, builders, purpose, a weird detail) and one good joke or
  wry observation. Facts that survive fact-checking; jokes that survive a second read.
- Favour the *"huh, that's cool"* fact over the famous one. Everyone knows the Colosseum
  held gladiator fights; fewer know it had a retractable awning system and numbered gates
  that could empty 50,000 people in minutes. Lead with the second kind.
- **Mild cheek, family-friendly.** The app is called Old Shit; that's most of the joke
  already. Use the word sparingly in copy (~1 in 8 entries), never forced.
- **Punch at time, not at people.** Jokes about how old, absurd, over-engineered, or
  poorly reviewed by history something is: yes. Jokes about cultures, religions, or
  tragedies: no. Sites of atrocity or mourning don't belong in the curated set at all —
  humor is the product, and it would be wrong there.
- Wikipedia-sourced text is **never rewritten to be funny** — it's shown as-is with the
  badge "Straight from Wikipedia — blame them for the dry tone". The framing is the joke;
  the content stays accurate and attributed.
- All UI microcopy lives in `mobile/src/copy.ts`. Keep it in one voice. Examples of the
  house style: "Rate this old shit", "No comments yet. Surely you have opinions about very
  old things", "1.2 km between you and this old shit", "Carbon-dating your surroundings…".

## Architecture

```
old-shit/
├── backend/            Django 5 + DRF API, SQLite (WAL), token auth
│   ├── oldshit/        project settings (env-driven; dev works with zero env vars)
│   ├── sites/          the domain app — NOTE: AppConfig label is "historic_sites"
│   │   ├── models.py       Site, Comment, Rating (unique per user+site), SitePhoto
│   │   ├── views.py        list / nearby / search / detail / comments / ratings / photos
│   │   ├── serializers.py  list vs detail serializers; ticket_link() fallback logic
│   │   ├── geo.py          haversine + bounding box (no GeoDjango, on purpose)
│   │   ├── wikipedia.py    GeoSearch integration (see below)
│   │   ├── seed_data.py    the curated 55 — the app's personality lives here
│   │   └── management/commands/seed_sites.py   idempotent, keyed on slug
│   └── accounts/       register / login / me (DRF token auth)
├── mobile/             Expo React Native, TypeScript, expo-router (src/app/ routes)
│   └── src/            api client, AuthContext, useLocation, components, copy.ts, types.ts
├── deploy/             internal Caddyfile + web.Dockerfile + luma001 Caddy snippet
├── docker-compose.yml  two containers (api + proxy), ONE published port 127.0.0.1:8020
├── scripts/smoke.sh    curl end-to-end against a live server
└── DEPLOY.md           luma001 runbook
```

### Data model in one breath

`Site` is the universe. It has coords, a description, an era string, optional
`ticket_url`, and a `source` of either `curated` (seeded, funny, hand-written) or
`wikipedia` (materialized at runtime). Users attach `Comment`s, `Rating`s (1–5, one per
user per site, re-rating updates via `update_or_create`), `SitePhoto`s, `Visit`s
(check-ins, one per user per site), and `CommentVote`s (upvotes, toggled).

### The social layer

- **Check-ins:** POST/DELETE `/api/sites/<pk>/visits/` — "I saw this old shit". Detail
  responses carry `visit_count` / `visited_by_me`.
- **Upvotes & top take:** POST `/api/comments/<pk>/vote/` toggles; the most-upvoted
  comment (≥1 vote) is the site's `top_take`, shown as a card on the detail screen.
- **Community screen** (`mobile/src/app/community.tsx`): `/api/activity/` (merged recent
  visits/comments/photos) + `/api/leaderboard/` (users ranked by visits).
- **Profiles:** `/api/users/<username>/` — stats incl. `years_of_old_shit`, the sum of
  visited sites' ages parsed from `era` by `sites/era.py` (conservative parser: returns
  None rather than guess; "Roman, c. 80 AD", "15th century", "3000 BC" all work).
- **Sharing:** detail responses carry a server-built `share_url` pointing at the web app
  (`/site/<id>`), used by the native Share sheet — shared links open in any browser
  because the production stack serves the same-origin web build. That's the growth loop.

### The hybrid data strategy (the clever bit)

The curated 55 make the app charming; Wikipedia makes it work *everywhere*:

1. `GET /api/sites/nearby/?lat=&lng=&radius=` first calls
   `wikipedia.fetch_and_cache_nearby()` — one combined GeoSearch API request
   (`generator=geosearch` + extracts + pageimages + info) that materializes pages as
   `Site` rows keyed on `wikipedia_pageid`.
2. **Dedupe:** a wiki page within 150 m of a curated site with an overlapping name gets
   its pageid linked onto the curated row instead of creating a duplicate. The curated
   description always wins; the wiki thumbnail fills an empty `image_url`.
3. **Throttle:** locmem cache key per ~1 km grid cell, 1-hour TTL, so pull-to-refresh
   can't hammer Wikimedia. Descriptions refresh only if `wiki_fetched_at` > 7 days.
4. **Resilience:** every Wikipedia call is wrapped; failures log a warning and the feed
   serves DB-only results. Wikipedia being down must never 500 the feed. There are tests
   asserting this — keep them passing.
5. The query then runs locally: bounding-box prefilter on indexed lat/lng columns,
   exact haversine in Python, sort by distance, paginate.

Wikimedia etiquette: descriptive `User-Agent` (in settings), 8 s timeout. Don't remove
either.

### Ticket links

`serializers.ticket_link()`: curated sites with a real official booking URL return it with
`ticket_url_kind: "official"`; everything else gets a GetYourGuide search URL with kind
`"search"`. The mobile app renders "Book tickets to see this old shit" vs "Find tours
nearby" off the kind. **Never fabricate official-looking deep links** — an honest search
link always resolves. URL construction stays server-side so the provider (or a future
affiliate code) can change without an app-store release.

### Mobile conventions

- Routes live in `mobile/src/app/` (expo-router): `index` (feed), `search`, `login`,
  `register`, `site/[id]`.
- `src/types.ts` mirrors the DRF serializers — if you change a serializer, change the
  types, and `tsc --noEmit` becomes the API-drift alarm.
- Auth token in `expo-secure-store`, with a `localStorage` fallback on web (SecureStore
  doesn't exist there). See the `tokenStorage` adapter in `AuthContext.tsx`.
- API base URL: `EXPO_PUBLIC_API_URL` env at build time; `/` (or empty) means same-origin
  — that's how the production web build works. Dev fallback is `http://localhost:8000`.
- Browsing never requires login; writing (comment/rate/photo) prompts for it.

## Running and verifying

```bash
# Backend
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python manage.py migrate && .venv/bin/python manage.py seed_sites
.venv/bin/python manage.py runserver 0.0.0.0:8000
.venv/bin/python manage.py test            # 22 tests; use module paths, e.g.
                                           # `test sites.tests.test_api` (NOT the app
                                           # label historic_sites — module path wins)
./scripts/smoke.sh                         # live curl assertions, needs jq

# Mobile
cd mobile && npm install
npx tsc --noEmit                           # primary CI-able check
npx expo export --platform web             # headless bundle check
EXPO_PUBLIC_API_URL=http://<lan-ip>:8000 npx expo start   # on a phone via Expo Go

# Production stack (luma001)
cp .env.example .env  # set DJANGO_SECRET_KEY + OLDSHIT_HOST
docker compose up -d --build               # then see DEPLOY.md for the Caddy block
```

Gotchas already handled — don't regress them:
- The `sites` app label is `historic_sites` (avoids `django.contrib.sites` collisions).
- SQLite runs in WAL mode because the nearby endpoint *writes* (materializes wiki rows)
  during a GET.
- Wiki extracts are truncated to 1,500 chars; pages with no extract or no coords are
  skipped (bare coordinate stubs make lousy feed cards).
- `SECURE_PROXY_SSL_HEADER` trusts Caddy's `X-Forwarded-Proto` so photo URLs are https.
- Native-adjacent Expo packages must be installed with `npx expo install` (version pins
  matter more than usual in Expo land).

## Seed data rules (`backend/sites/seed_data.py`)

When adding curated sites:
- Real coordinates to 3–4 decimals; unique lowercase-hyphen slug; short human `era`
  ("Neolithic, c. 3000 BC", "Inca, 15th century").
- Description follows the tone rules above. Write it fresh — never copy Wikipedia.
- `ticket_url` only if you're confident an official page exists (stable top-level
  official domains beat deep links, which rot). Otherwise `""` and the GetYourGuide
  fallback handles it.
- `image_url` stays `""` — the Wikipedia dedupe fills it with a proper thumbnail at
  runtime.
- No sites of atrocity/mourning. If humor doesn't fit, the site doesn't fit.
- Seeding is idempotent (`update_or_create` on slug) — rerunning `seed_sites` refreshes
  descriptions without duplicating.

## Future features (the roadmap of dreams)

Roughly ordered by value-for-effort. Each respects the existing architecture.

### Near-term, high value
- **"Huh, that's cool" facts** — a `facts` table (site FK, one-liner, source) surfaced as
  a rotating card on the detail screen and a "fact of the day" push notification.
  ("The Pantheon's dome has a hole in it. On purpose. It's been raining inside for 1,900
  years and everyone's fine with it.")
- **Map view** — the feed as pins on a map (react-native-maps / MapLibre). The data model
  already has coords on everything; it's purely a mobile feature.
- **Distance-based push: "You are walking past old shit right now"** — background
  location + a geofence around high-rated sites. The killer feature for the wandering
  tourist. Needs battery care and an opt-in.
- **Want-to-visit list** — visited check-ins exist; add a `wishlist` flag (or a second
  model) for "old shit I intend to see", plus a personal map of conquered ruins.
- **Photo of the week** — lightweight moderation + a featured flag on `SitePhoto`;
  surfaces community content and gives people a reason to post good photos.
- **Site "age receipts"** — every detail screen computes fun age comparisons from `era`:
  "This wall is 47× older than the United States" / "Built 1,200 years before the fork
  was considered acceptable in Europe." The parser already exists (`sites/era.py`, built
  for profile stats) — this is now pure copywriting.

### Medium-term
- **Curated city packs** — hand-written walking routes ("Rome in one hungover morning":
  5 sites, 3 km, 2 jokes per stop). A `Route` model with ordered site FKs; big
  differentiator vs generic POI apps.
- **Audio blurbs** — 30-second narrated versions of descriptions for walking around
  (TTS is fine to start). The tone was made to be read aloud.
- **Offline packs** — download a city's sites + images for data-roaming-free tourism.
  The API is already paginated and cacheable; add a `?bbox=` bulk endpoint.
- **Wikidata enrichment** — pull `inception` dates, architect, heritage status via the
  pageid we already store. Structured `era` unlocks timelines and better age jokes.
- **Eras & categories filter** — "only show me Roman shit" / castles / megaliths /
  "things older than agriculture". Add a `category` field + chips above the feed.
- **Badges** — the leaderboard exists; add "Certified Ruin Enjoyer" (10 visits), "Older
  Than Dirt Club" (5 prehistoric sites), "Column Connoisseur" (all Greek/Roman seeds).
  Cheap joy on top of the existing `Visit` data.
- **Follow other ruin enjoyers** — a `Follow` model + a "people you follow" filter on
  the activity feed; turns the community screen into a real social feed.
- **i18n** — Wikipedia integration is language-parameterizable (`en.wikipedia.org` →
  per-locale); curated descriptions need human translation to keep the jokes funny.

### Long-term / ambitious
- **"Then vs now" image overlays** — historic photos/paintings (Wikimedia Commons has
  license-friendly ones) aligned with the user's camera view. Start with a simple
  before/after slider, not full AR.
- **Old Shit Quiz mode** — multiple choice from facts + descriptions ("Which is older:
  this pub or the Aztec Empire?"). Data's already there.
- **Trip journal auto-generation** — stitch a user's visits, photos, and ratings into a
  shareable "My Summer of Old Shit" page.
- **Affiliate ticketing** — the `ticket_url_kind: "search"` fallback becomes a revenue
  line by swapping in an affiliate parameter server-side (already a one-function change).
- **User-submitted sites** — with a review queue. The moment this ships, moderation
  becomes a real feature (report button, admin queue); don't ship the first without the
  second.
- **Postgres + PostGIS migration** — when the wiki-materialized table gets big, swap the
  haversine-in-Python for real spatial queries. The `geo.py` seam and the
  `annotated_sites()` helper were left precisely so this is a contained change.

### Explicitly out of scope (decided, don't re-litigate)
- Rewriting Wikipedia text into "funny" voice — attribution + framing only.
- Humor about atrocity sites — they're excluded from curation entirely.
- Fabricated ticket/booking deep links — official or honest search, nothing in between.

## Deployment reality

Production target is **luma001**, Docker-Compose-per-app, behind the machine's main Caddy.
This stack publishes exactly one port (`127.0.0.1:8020` by default) and the main
Caddyfile gets a two-line `reverse_proxy` block (`deploy/luma001.Caddyfile`). The internal
Caddy serves the same-origin web build, `/media`, `/static`, and proxies `/api` +
`/admin` to gunicorn. Full runbook: `DEPLOY.md`.

Sandbox note for Claude sessions: the remote-dev proxy blocks wikipedia.org and Docker
Hub's CDN — live wiki fetches and image pulls won't work in-session. The mocked tests
cover the wiki logic; the graceful-degradation path is what you'll see live. Don't
"fix" it.
