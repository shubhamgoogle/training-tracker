#!/usr/bin/env bash

PROJECT_ID="${PROJECT_ID:-deepspace-460917}"
REGION="${REGION:-asia-south1}"
SERVICE_NAME="${SERVICE_NAME:-training-tracker}"
BUCKET_NAME="${BUCKET_NAME:-${PROJECT_ID}-${SERVICE_NAME}-data}"

echo "Ensuring persistent Cloud Storage bucket gs://${BUCKET_NAME} exists..."
if ! gcloud storage buckets describe "gs://${BUCKET_NAME}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://${BUCKET_NAME}" \
    --project "${PROJECT_ID}" \
    --location "${REGION}" \
    --uniform-bucket-level-access
fi

echo "Deploying ${SERVICE_NAME} to Google Cloud Run (project: ${PROJECT_ID}, region: ${REGION})..."

gcloud run deploy "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --source . \
  --execution-environment gen2 \
  --add-volume "name=tracker-storage,type=cloud-storage,bucket=${BUCKET_NAME}" \
  --add-volume-mount "volume=tracker-storage,mount-path=/app/storage" \
  --set-env-vars "PERSISTENT_DIR=/app/storage" \
  --allow-unauthenticated \
  --max-instances 1 \
  --memory 512Mi \
  --cpu 1

echo "Deployment complete!"
