#!/bin/sh
set -e

mkdir -p /app/data /app/public/uploads

if [ "${PRISMA_DB_PUSH}" = "true" ]; then
  echo "Running prisma db push..."
  if [ "${DATABASE_URL}" = "file:/app/data/dev.db" ]; then
    touch /app/data/dev.db
  fi
  /opt/prisma/node_modules/.bin/prisma db push --schema /app/prisma/schema.prisma
fi

exec "$@"
