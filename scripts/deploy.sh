#!/usr/bin/env bash
# deploy.sh — Build portfolio frontend + contact API, load into remote k3s, and deploy
# Usage: ./scripts/deploy.sh
# Env overrides:
#   MONGO_ROOT_USERNAME, MONGO_ROOT_PASSWORD, MONGO_DB_NAME
#   ADMIN_API_TOKEN, TURNSTILE_SECRET_KEY, VITE_TURNSTILE_SITE_KEY
#   RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS
# Note: keep MONGO_ROOT_PASSWORD stable after first deployment unless you
# reinitialize the MongoDB data volume.
#
# ── One-time setup on thunderball (run once before first deploy) ──────────────
#   kubectl --kubeconfig /home/borg/.kube/k3s-remote apply -f k8s/namespace.yaml
#
#   # Create a Cloudflare Tunnel at https://one.dash.cloudflare.com → Networks → Tunnels
#   # Set the public hostname:  xgalvanize.ca → http://portfolio-frontend.portfolio.svc.cluster.local:80
#   # Copy the tunnel token, then:
#
#   kubectl --kubeconfig /home/borg/.kube/k3s-remote \
#     create secret generic portfolio-cloudflared-credentials \
#     --namespace portfolio \
#     --from-literal=token=<YOUR_CLOUDFLARE_TUNNEL_TOKEN>
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

KUBECONFIG_PATH="${KUBECONFIG_PATH:-/home/borg/.kube/k3s-remote}"
NODE_SSH_HOST="${NODE_SSH_HOST:-thunderball}"
KUBECTL=(kubectl --kubeconfig "${KUBECONFIG_PATH}")
FRONTEND_IMAGE="portfolio-frontend:latest"
CONTACT_API_IMAGE="portfolio-contact-api:latest"
MONGO_ROOT_USERNAME="${MONGO_ROOT_USERNAME:-portfolio_admin}"
MONGO_ROOT_PASSWORD="${MONGO_ROOT_PASSWORD:-change-me-root-password}"
MONGO_DB_NAME="${MONGO_DB_NAME:-portfolio}"
ADMIN_API_TOKEN="${ADMIN_API_TOKEN:-replace-with-long-random-token}"
TURNSTILE_SECRET_KEY="${TURNSTILE_SECRET_KEY:-}"
VITE_TURNSTILE_SITE_KEY="${VITE_TURNSTILE_SITE_KEY:-}"
RATE_LIMIT_WINDOW_MS="${RATE_LIMIT_WINDOW_MS:-900000}"
RATE_LIMIT_MAX_REQUESTS="${RATE_LIMIT_MAX_REQUESTS:-5}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
K8S_DIR="${REPO_ROOT}/k8s"

echo "================================================"
echo " Portfolio Deploy Script"
echo " Kubeconf : ${KUBECONFIG_PATH}"
echo " Node SSH : ${NODE_SSH_HOST}"
echo "================================================"
echo ""

if [[ "${MONGO_ROOT_PASSWORD}" == "change-me-root-password" ]]; then
  echo "WARNING: Using default MONGO_ROOT_PASSWORD. Set a stronger value before production." >&2
fi
if [[ "${ADMIN_API_TOKEN}" == "replace-with-long-random-token" ]]; then
  echo "WARNING: Using default ADMIN_API_TOKEN. Set a strong random token before production." >&2
fi

echo "▶ Rendering runtime secret manifest..."
cat >"${K8S_DIR}/secrets.yaml" <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: portfolio-contact-secrets
  namespace: portfolio
type: Opaque
stringData:
  mongodb-root-username: ${MONGO_ROOT_USERNAME}
  mongodb-root-password: ${MONGO_ROOT_PASSWORD}
  mongodb-db: ${MONGO_DB_NAME}
  admin-api-token: ${ADMIN_API_TOKEN}
  turnstile-secret-key: ${TURNSTILE_SECRET_KEY}
  rate-limit-window-ms: "${RATE_LIMIT_WINDOW_MS}"
  rate-limit-max-requests: "${RATE_LIMIT_MAX_REQUESTS}"
EOF

# ── Build image locally ────────────────────────────────────────────────────────
echo "▶ Building frontend image..."
docker build \
  --build-arg VITE_TURNSTILE_SITE_KEY="${VITE_TURNSTILE_SITE_KEY}" \
  -t "${FRONTEND_IMAGE}" "${REPO_ROOT}/frontend"

echo "▶ Building contact API image..."
docker build -t "${CONTACT_API_IMAGE}" "${REPO_ROOT}/contact-api"

# ── Load image into remote k3s runtime ────────────────────────────────────────
echo ""
echo "▶ Loading image into k3s on ${NODE_SSH_HOST}..."
LOCAL_ARCHIVE="$(mktemp /tmp/portfolio-image-XXXXXX.tar)"
REMOTE_ARCHIVE="/tmp/$(basename "${LOCAL_ARCHIVE}")"

echo "▶ Creating local image archive..."
docker save -o "${LOCAL_ARCHIVE}" "${FRONTEND_IMAGE}" "${CONTACT_API_IMAGE}"

echo "▶ Copying archive to ${NODE_SSH_HOST}..."
scp "${LOCAL_ARCHIVE}" "${NODE_SSH_HOST}:${REMOTE_ARCHIVE}"
rm -f "${LOCAL_ARCHIVE}"

echo "▶ Importing image into k3s (sudo may prompt once)..."
ssh -t "${NODE_SSH_HOST}" "sudo sh -c 'k3s ctr images import \"${REMOTE_ARCHIVE}\" && rm -f \"${REMOTE_ARCHIVE}\"'"

# ── Deploy to Kubernetes ───────────────────────────────────────────────────────
echo ""
echo "▶ Applying Kubernetes manifests..."
"${KUBECTL[@]}" apply -f "${K8S_DIR}/namespace.yaml"
"${KUBECTL[@]}" apply -f "${K8S_DIR}/secrets.yaml"
"${KUBECTL[@]}" apply -f "${K8S_DIR}/mongodb.yaml"
"${KUBECTL[@]}" apply -f "${K8S_DIR}/contact-api.yaml"
"${KUBECTL[@]}" apply -f "${K8S_DIR}/frontend.yaml"
"${KUBECTL[@]}" apply -f "${K8S_DIR}/cloudflared.yaml"

echo ""
echo "▶ Restarting deployments to pick up new image..."
"${KUBECTL[@]}" -n portfolio rollout restart deployment/portfolio-mongodb
"${KUBECTL[@]}" -n portfolio rollout restart deployment/portfolio-contact-api
"${KUBECTL[@]}" -n portfolio rollout restart deployment/portfolio-frontend
"${KUBECTL[@]}" -n portfolio rollout restart deployment/portfolio-cloudflared

# ── Wait for rollout ───────────────────────────────────────────────────────────
echo ""
echo "▶ Waiting for deployments to be ready..."
"${KUBECTL[@]}" rollout status deployment/portfolio-mongodb   -n portfolio --timeout=180s
"${KUBECTL[@]}" rollout status deployment/portfolio-contact-api -n portfolio --timeout=120s
"${KUBECTL[@]}" rollout status deployment/portfolio-frontend   -n portfolio --timeout=120s
"${KUBECTL[@]}" rollout status deployment/portfolio-cloudflared -n portfolio --timeout=60s

echo ""
echo "================================================"
echo " Deployment complete!"
echo " Site: https://xgalvanize.ca"
echo "================================================"
