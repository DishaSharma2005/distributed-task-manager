#!/usr/bin/env bash
# =============================================================
# deploy.sh — Deploy the task manager Docker container on EC2
#
# Usage:
#   INSTANCE_ID=EC2-INSTANCE-1 MONGODB_URI="mongodb+srv://..." ./scripts/deploy.sh
#
# Or export variables before running:
#   export INSTANCE_ID=EC2-INSTANCE-1
#   export MONGODB_URI=mongodb+srv://...
#   ./scripts/deploy.sh
# =============================================================

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────
IMAGE="ghcr.io/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME:latest"
CONTAINER_NAME="task-manager"
APP_PORT="3000"

# ─── Validate required environment variables ──────────────────
if [[ -z "${INSTANCE_ID:-}" ]]; then
  echo "ERROR: INSTANCE_ID environment variable is required."
  echo "  Example: INSTANCE_ID=EC2-INSTANCE-1"
  exit 1
fi

if [[ -z "${MONGODB_URI:-}" ]]; then
  echo "ERROR: MONGODB_URI environment variable is required."
  exit 1
fi

echo "======================================================"
echo "  Deploying Distributed Task Manager"
echo "  Instance : $INSTANCE_ID"
echo "  Image    : $IMAGE"
echo "======================================================"

# ─── Pull the latest image ────────────────────────────────────
echo "[1/4] Pulling latest Docker image..."
docker pull "$IMAGE"

# ─── Stop and remove the old container ───────────────────────
echo "[2/4] Stopping existing container (if running)..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm   "$CONTAINER_NAME" 2>/dev/null || true

# ─── Start the new container ─────────────────────────────────
echo "[3/4] Starting new container..."
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p "${APP_PORT}:${APP_PORT}" \
  -e PORT="$APP_PORT" \
  -e INSTANCE_ID="$INSTANCE_ID" \
  -e MONGODB_URI="$MONGODB_URI" \
  "$IMAGE"

# ─── Verify the container is running ─────────────────────────
echo "[4/4] Verifying health check..."
sleep 5
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:"$APP_PORT"/health || echo "000")

if [[ "$HTTP_STATUS" == "200" ]]; then
  echo ""
  echo "  ✓ Deployment successful!"
  echo "  ✓ Health check passed (HTTP $HTTP_STATUS)"
  echo "  ✓ Application running on port $APP_PORT"
  echo "  ✓ Instance: $INSTANCE_ID"
else
  echo ""
  echo "  ✗ Health check returned HTTP $HTTP_STATUS"
  echo "  Check container logs with: docker logs $CONTAINER_NAME"
  exit 1
fi
