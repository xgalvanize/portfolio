#!/usr/bin/env bash
# deploy.sh — Build portfolio frontend, load into remote k3s, and deploy
# Usage: ./scripts/deploy.sh
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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
K8S_DIR="${REPO_ROOT}/k8s"

echo "================================================"
echo " Portfolio Deploy Script"
echo " Kubeconf : ${KUBECONFIG_PATH}"
echo " Node SSH : ${NODE_SSH_HOST}"
echo "================================================"
echo ""

# ── Build image locally ────────────────────────────────────────────────────────
echo "▶ Building frontend image..."
docker build -t "${FRONTEND_IMAGE}" "${REPO_ROOT}/frontend"

# ── Load image into remote k3s runtime ────────────────────────────────────────
echo ""
echo "▶ Loading image into k3s on ${NODE_SSH_HOST}..."
LOCAL_ARCHIVE="$(mktemp /tmp/portfolio-image-XXXXXX.tar)"
REMOTE_ARCHIVE="/tmp/$(basename "${LOCAL_ARCHIVE}")"

echo "▶ Creating local image archive..."
docker save -o "${LOCAL_ARCHIVE}" "${FRONTEND_IMAGE}"

echo "▶ Copying archive to ${NODE_SSH_HOST}..."
scp "${LOCAL_ARCHIVE}" "${NODE_SSH_HOST}:${REMOTE_ARCHIVE}"
rm -f "${LOCAL_ARCHIVE}"

echo "▶ Importing image into k3s (sudo may prompt once)..."
ssh -t "${NODE_SSH_HOST}" "sudo sh -c 'k3s ctr images import \"${REMOTE_ARCHIVE}\" && rm -f \"${REMOTE_ARCHIVE}\"'"

# ── Deploy to Kubernetes ───────────────────────────────────────────────────────
echo ""
echo "▶ Applying Kubernetes manifests..."
"${KUBECTL[@]}" apply -f "${K8S_DIR}/namespace.yaml"
"${KUBECTL[@]}" apply -f "${K8S_DIR}/frontend.yaml"
"${KUBECTL[@]}" apply -f "${K8S_DIR}/cloudflared.yaml"

echo ""
echo "▶ Restarting deployments to pick up new image..."
"${KUBECTL[@]}" -n portfolio rollout restart deployment/portfolio-frontend
"${KUBECTL[@]}" -n portfolio rollout restart deployment/portfolio-cloudflared

# ── Wait for rollout ───────────────────────────────────────────────────────────
echo ""
echo "▶ Waiting for deployments to be ready..."
"${KUBECTL[@]}" rollout status deployment/portfolio-frontend   -n portfolio --timeout=120s
"${KUBECTL[@]}" rollout status deployment/portfolio-cloudflared -n portfolio --timeout=60s

echo ""
echo "================================================"
echo " Deployment complete!"
echo " Site: https://xgalvanize.ca"
echo "================================================"
