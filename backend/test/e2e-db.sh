#!/usr/bin/env bash
# Throwaway Postgres for the e2e suite.
#
# Isolated on purpose: the suite inserts and deletes rows, so it must never point
# at the development stack or at anything with real data. Port 55432 keeps it
# clear of the compose service and of any other project on this machine.
set -euo pipefail

NAME="${E2E_DB_NAME:-followup-e2e-postgres}"
PORT="${E2E_DB_PORT:-55432}"

case "${1:-start}" in
  start)
    if docker ps -a --format '{{.Names}}' | grep -qx "$NAME"; then
      docker start "$NAME" >/dev/null
    else
      docker run -d --name "$NAME" -p "127.0.0.1:${PORT}:5432" \
        -e POSTGRES_USER=followup \
        -e POSTGRES_PASSWORD=test \
        -e POSTGRES_DB=followup_test \
        postgres:16-alpine >/dev/null
    fi

    for _ in $(seq 1 30); do
      if docker exec "$NAME" pg_isready -U followup -d followup_test >/dev/null 2>&1; then
        echo "e2e database ready on 127.0.0.1:${PORT}"
        exit 0
      fi
      sleep 1
    done

    echo "e2e database did not become ready in 30s" >&2
    exit 1
    ;;
  stop)
    docker rm -f "$NAME" >/dev/null 2>&1 || true
    echo "e2e database removed"
    ;;
  *)
    echo "usage: $0 {start|stop}" >&2
    exit 1
    ;;
esac
