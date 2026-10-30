#!/usr/bin/env bash
set -euo pipefail

IMAGE_TAG="samsam/web:2.6.0"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

sudo docker build --tag "$IMAGE_TAG" "$ROOT_DIR"
sudo docker save "$IMAGE_TAG" | sudo ctr --namespace k8s.io images import -
kubectl apply --filename "$ROOT_DIR/k8s/samsam.yaml"
kubectl rollout status deployment/web --namespace samsam --timeout=120s
kubectl get service web --namespace samsam
