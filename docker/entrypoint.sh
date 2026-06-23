#!/bin/sh
set -e

mkdir -p /app/data /app/public/uploads

if [ "${PRISMA_DB_PUSH}" = "true" ]; then
  echo "Running prisma db push..."
  npx prisma db push
fi

exec "$@"
