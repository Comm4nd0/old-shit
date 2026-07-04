#!/usr/bin/env bash
# End-to-end smoke test: boots the API, seeds it, and pokes every endpoint.
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/../backend" && pwd)"
PY="$BACKEND_DIR/.venv/bin/python"
PORT="${PORT:-8000}"
BASE="http://127.0.0.1:$PORT"

cd "$BACKEND_DIR"
$PY manage.py migrate --no-input >/dev/null
$PY manage.py seed_sites

$PY manage.py runserver "$PORT" --noreload >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
for _ in $(seq 1 30); do
  curl -sf "$BASE/api/sites/?page=1" >/dev/null 2>&1 && break
  sleep 0.5
done

echo "== site list =="
curl -sf "$BASE/api/sites/?page=1" | jq -e '.count >= 50' >/dev/null && echo "ok: >=50 seeded sites"

echo "== nearby (Rome) =="
curl -sf "$BASE/api/sites/nearby/?lat=41.8902&lng=12.4922&radius=25" \
  | jq -e '.results[0].distance_km < 5' >/dev/null && echo "ok: Colosseum-ish thing nearby"

echo "== search =="
curl -sf "$BASE/api/sites/search/?q=colosseum" \
  | jq -e '.results[0].slug == "colosseum"' >/dev/null && echo "ok: search finds the Colosseum"

echo "== register + comment + rate =="
SUFFIX=$RANDOM
TOKEN=$(curl -sf -X POST "$BASE/api/auth/register/" -H 'Content-Type: application/json' \
  -d "{\"username\":\"smoke$SUFFIX\",\"email\":\"smoke$SUFFIX@test.io\",\"password\":\"extremely-old-shit-$SUFFIX\"}" | jq -r .token)
SITE_ID=$(curl -sf "$BASE/api/sites/search/?q=colosseum" | jq -r '.results[0].id')
curl -sf -X POST "$BASE/api/sites/$SITE_ID/comments/" -H "Authorization: Token $TOKEN" \
  -H 'Content-Type: application/json' -d '{"text":"Very old. Would shit again."}' \
  | jq -e '.username != null' >/dev/null && echo "ok: comment posted"
curl -sf -X POST "$BASE/api/sites/$SITE_ID/ratings/" -H "Authorization: Token $TOKEN" \
  -H 'Content-Type: application/json' -d '{"value":5}' \
  | jq -e '.rating_count >= 1' >/dev/null && echo "ok: rated 5 stars"

echo "== detail + ticket link =="
curl -sf "$BASE/api/sites/$SITE_ID/" \
  | jq -e '.ticket_url_kind == "official" and .user_rating == null' >/dev/null && echo "ok: detail has official ticket link"

echo
echo "ALL SMOKE TESTS PASSED"
