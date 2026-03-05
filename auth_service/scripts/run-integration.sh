#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# run-integration.sh
# Starts a PostgreSQL container, waits for it, runs Prisma
# migrations, executes integration tests, and tears everything
# down -- regardless of test outcome.
# ──────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/../docker-compose.yaml"

export DATABASE_URL="postgresql://looply:password@localhost:5432/looply"
export JWT_SECRET="integration-test-secret"
export JWT_EXPIRES_IN="1h"
export NODE_ENV="test"

echo ">> Starting postgres container..."
docker compose -f "$COMPOSE_FILE" up -d postgres

echo ">> Waiting for postgres to accept connections..."
until docker compose -f "$COMPOSE_FILE" exec -T postgres \
  pg_isready -U looply -d looply > /dev/null 2>&1; do
  sleep 1
done
echo "  [OK] postgres is ready"

echo ">> Running Prisma migrations..."
cd "$PROJECT_ROOT"
npx prisma generate
npx prisma migrate deploy 2>/dev/null || npx prisma db push --force-reset --accept-data-loss

echo ">> Running integration tests..."
TEST_EXIT=0
npx vitest run --config vitest.integration.config.ts || TEST_EXIT=$?

echo ">> Tearing down containers..."
docker compose -f "$COMPOSE_FILE" down -v --remove-orphans

exit $TEST_EXIT
