#!/bin/bash

# Generate TypeORM migration
echo "Generating new migration..."

# Check if name is provided
if [ -z "$1" ]; then
  echo "Usage: ./scripts/generate-migration.sh MigrationName"
  exit 1
fi

# Generate migration
npm run typeorm migration:generate -- -n $1

echo "Migration generated successfully!"
echo "To run migrations: npm run migration:run"