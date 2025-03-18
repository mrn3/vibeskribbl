#!/bin/bash
set -e

echo "Starting deployment..."

# Navigate to project directory
cd "$(dirname "$0")"

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build Next.js app and TypeScript files
echo "Building Next.js and TypeScript..."
npm run build

# Make sure TypeScript is compiled separately with the server config
echo "Ensuring TypeScript compilation..."
npx tsc --project tsconfig.server.json

# Restart the PM2 service
echo "Restarting service..."
npm run pm2:restart

echo "Deployment completed successfully!" 