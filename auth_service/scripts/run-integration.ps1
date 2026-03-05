# ──────────────────────────────────────────────────────────────
# run-integration.ps1
# Starts a PostgreSQL container, waits for it, runs Prisma
# migrations, executes integration tests, and tears everything
# down -- regardless of test outcome.
# ──────────────────────────────────────────────────────────────
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ProjectRoot = Split-Path -Parent $ScriptDir
$ComposeFile = Join-Path (Split-Path -Parent $ProjectRoot) "docker-compose.yaml"

# Export env vars expected by Prisma / the app
$env:DATABASE_URL = "postgresql://looply:password@localhost:5432/looply"
$env:JWT_SECRET = "integration-test-secret"
$env:JWT_EXPIRES_IN = "1h"
$env:NODE_ENV = "test"

Write-Host ">> Starting postgres container..."
docker compose -f $ComposeFile up -d postgres

Write-Host ">> Waiting for postgres to accept connections..."
$ready = $false
$attempts = 0
while (-not $ready -and $attempts -lt 30) {
    try {
        $result = docker compose -f $ComposeFile exec -T postgres pg_isready -U looply -d looply 2>$null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
        } else {
            Start-Sleep -Seconds 1
            $attempts++
        }
    } catch {
        Start-Sleep -Seconds 1
        $attempts++
    }
}

if (-not $ready) {
    Write-Host "  [FAIL] postgres did not become ready in time" -ForegroundColor Red
    docker compose -f $ComposeFile down -v --remove-orphans
    exit 1
}
Write-Host "  [OK] postgres is ready"

Write-Host ">> Running Prisma migrations..."
Push-Location $ProjectRoot
try {
    npx prisma generate
    npx prisma migrate deploy 2>$null
    if ($LASTEXITCODE -ne 0) {
        npx prisma db push --force-reset --accept-data-loss
    }
} catch {
    npx prisma db push --force-reset --accept-data-loss
}

Write-Host ">> Running integration tests..."
$TestExit = 0
npx vitest run --config vitest.integration.config.ts
if ($LASTEXITCODE -ne 0) { $TestExit = $LASTEXITCODE }

Pop-Location

Write-Host ">> Tearing down containers..."
docker compose -f $ComposeFile down -v --remove-orphans

exit $TestExit
