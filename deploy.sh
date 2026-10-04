#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-deepspace-460917}"
REGION="${REGION:-asia-south1}"
SERVICE_NAME="${SERVICE_NAME:-training-tracker}"

echo "Deploying ${SERVICE_NAME} to Google Cloud Run (project: ${PROJECT_ID}, region: ${REGION})..."
gcloud run deploy "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --source . \
  --allow-unauthenticated \
  --max-instances 1 \
  --memory 256Mi \
  --cpu 1

echo "Deployment complete!"
