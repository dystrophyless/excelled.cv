#!/usr/bin/env bash
set -euo pipefail

cd /opt/novio
set -a
source /var/lib/novio/runtime.env
set +a
export NOVIO_DATA_DIR=/var/lib/novio
export NOVIO_IMAGE=novio:release

compose=(docker compose --file compose.yaml)
active_file="$NOVIO_DATA_DIR/active-image"
failed_file="$NOVIO_DATA_DIR/failed-image"
previous=""
if [[ -s "$active_file" ]]; then
  read -r previous < "$active_file"
fi

metadata=$(curl --fail --silent --show-error --retry 3 --connect-timeout 10 --max-time 30 \
  https://api.github.com/repos/dystrophyless/excelled.cv/releases/tags/aws-deploy)
read -r asset_id digest < <(jq -er '
  .assets[] | select(.name == "novio-image.tar.gz" and .state == "uploaded") |
  select(.digest | test("^sha256:[a-f0-9]{64}$")) | [.id, .digest] | @tsv
' <<< "$metadata")
[[ "$asset_id" =~ ^[0-9]+$ && "$digest" =~ ^sha256:[a-f0-9]{64}$ ]]
candidate="novio:asset-$asset_id"
if [[ "$candidate" == "$previous" || ( -f "$failed_file" && "$candidate" == "$(cat "$failed_file")" ) ]]; then
  exit 0
fi

if ! docker image inspect "$candidate" >/dev/null 2>&1; then
  archive=$(mktemp)
  trap 'rm -f "$archive"' EXIT
  curl --fail --silent --show-error --location --retry 3 --connect-timeout 10 --max-time 240 \
    --header 'Accept: application/octet-stream' --output "$archive" \
    "https://api.github.com/repos/dystrophyless/excelled.cv/releases/assets/$asset_id"
  printf '%s  %s\n' "${digest#sha256:}" "$archive" | sha256sum --check --status
  docker load --input "$archive"
  docker image tag novio:release "$candidate"
  docker image rm novio:release
fi

export NOVIO_IMAGE="$candidate"
"${compose[@]}" up -d --wait --wait-timeout 100 db
"${compose[@]}" run --rm --no-deps api python -m src.scripts.create_tables
if "${compose[@]}" up -d --wait --wait-timeout 100 api web &&
    bash smoke.sh http://127.0.0.1:18081 "$NOVIO_FRONTEND_ORIGIN"; then
  printf '%s\n' "$candidate" > "$active_file.next"
  mv "$active_file.next" "$active_file"
  rm -f "$failed_file"
  docker image inspect "$candidate" --format 'Deployed revision {{index .Config.Labels "org.opencontainers.image.revision"}}'
  while read -r old_tag; do
    if [[ "$old_tag" != "$candidate" && "$old_tag" != "$previous" ]]; then
      docker image rm "$old_tag" || true
    fi
  done < <(docker image ls --filter 'reference=novio:asset-*' --format '{{.Repository}}:{{.Tag}}')
  exit 0
fi

if [[ -n "$previous" ]]; then
  export NOVIO_IMAGE="$previous"
  "${compose[@]}" up -d --wait --wait-timeout 100 api web
  bash smoke.sh http://127.0.0.1:18081 "$NOVIO_FRONTEND_ORIGIN"
  printf '%s\n' "$candidate" > "$failed_file"
fi
exit 1
