#!/bin/bash

# Railway start script
echo "Starting Telegram RPS Bot..."

# Set NODE_ENV if not set
export NODE_ENV=${NODE_ENV:-production}

# Log environment
echo "Environment: $NODE_ENV"
echo "Port: ${PORT:-3000}"
echo "Database URL: ${DATABASE_URL:0:30}..."

# Start the application
node dist/main.js