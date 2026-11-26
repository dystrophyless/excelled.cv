#!/usr/bin/env bash
set -euo pipefail

base_url=${1:?Pass the deployment URL}
frontend_origin=${2:-}
curl --fail --silent --show-error --retry 8 --retry-all-errors --retry-delay 2 --max-time 5 \
  "$base_url/api/catalog" |
  python3 -c 'import json, sys; assert json.load(sys.stdin)["types"]'
test "$(curl --silent --show-error --max-time 5 --output /dev/null --write-out '%{http_code}' "$base_url/api/unknown")" = 404
if [[ -n "$frontend_origin" ]]; then
  test "$(curl --silent --show-error --max-time 5 --request POST --output /dev/null \
    --header "Origin: $frontend_origin" --write-out '%{http_code}' "$base_url/api/unknown")" = 404
  test "$(curl --silent --show-error --max-time 5 --request POST --output /dev/null \
    --header 'Origin: https://untrusted.example.com' --write-out '%{http_code}' "$base_url/api/unknown")" = 403
fi
