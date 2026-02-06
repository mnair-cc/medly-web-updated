#!/bin/bash
# Heroku Cleanup Script
# Reduces slug size after build by removing unnecessary files
# Run as: npm run heroku-cleanup (called automatically by Heroku)

set -e  # Exit on error

APP_NAME="${APP_NAME:-exams}"
echo "🧹 Starting cleanup for app: $APP_NAME"

# ------------------------------------------------------------------------------
# 1. Remove dev dependencies
# ------------------------------------------------------------------------------
echo "📦 Pruning dev dependencies..."
npm prune --omit=dev

# ------------------------------------------------------------------------------
# 2. Remove build artifacts and caches
# ------------------------------------------------------------------------------
echo "🗑️  Removing turbo cache..."
rm -rf .turbo

echo "🗑️  Removing Next.js cache and e2e tests from deployed app..."
rm -rf "apps/${APP_NAME}/.next/cache" "apps/${APP_NAME}/e2e"

# ------------------------------------------------------------------------------
# 3. Run app-specific cleanup
# ------------------------------------------------------------------------------
echo "🔧 Running app-specific cleanup..."
(cd "apps/${APP_NAME}" && npm run heroku-cleanup) || true

# ------------------------------------------------------------------------------
# 4. Remove non-deployed apps (~100MB+ per app)
# ------------------------------------------------------------------------------
echo "🗑️  Removing other apps (keeping only $APP_NAME)..."
find apps -maxdepth 1 -mindepth 1 -type d ! -name "${APP_NAME}" -exec rm -rf {} \; || true

# ------------------------------------------------------------------------------
# 5. Clean up node_modules (at root level in monorepo)
# ------------------------------------------------------------------------------
echo "🗑️  Removing SWC binaries (~50-100MB)..."
find node_modules/@next -maxdepth 1 -type d -name 'swc*' -exec rm -rf {} \; 2>/dev/null || true

echo "🗑️  Removing cache directories from node_modules..."
find node_modules -type d -name '.cache' -prune -exec rm -rf {} \; 2>/dev/null || true

echo "🗑️  Removing source maps from node_modules..."
find node_modules -name '*.map' -delete 2>/dev/null || true

echo "🗑️  Removing playwright (test framework - ~100-200MB)..."
find node_modules -type d -name 'playwright' -prune -exec rm -rf {} \; 2>/dev/null || true
find node_modules -type d -name 'playwright-core' -prune -exec rm -rf {} \; 2>/dev/null || true

echo "✅ Cleanup complete!"
