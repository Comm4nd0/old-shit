#!/bin/sh
set -e

python manage.py migrate --no-input
python manage.py seed_sites
python manage.py collectstatic --no-input --clear

exec gunicorn oldshit.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers "${GUNICORN_WORKERS:-3}" \
  --forwarded-allow-ips "*"
