#!/usr/bin/env bash
set -euo pipefail

kubectl exec deployment/web --namespace samsam -- sh -c 'test -f /app/data/reports.jsonl && cat /app/data/reports.jsonl || true'
