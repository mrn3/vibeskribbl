#!/bin/bash
set -e

echo "Starting emergency deployment fix..."

# Navigate to project directory
cd /home/bitnami/vibeskribbl

# Stop PM2 service
echo "Stopping service..."
npx pm2 stop vibeskribbl

# Fix the server.js import
echo "Fixing server.js import path..."
sed -i 's|require(.\/dist\/src\/lib\/socketServer)|require(\.\/src\/lib\/socketServer)|g' server.js

# Build TypeScript files
echo "Building TypeScript..."
npx tsc --project tsconfig.server.json

# Create required directory structure just to be safe
echo "Creating fallback directory structure..."
mkdir -p dist/src/lib
cp -r src/lib/* dist/src/lib/

# Restart the service
echo "Restarting service..."
npx pm2 restart vibeskribbl

echo "Deployment fix completed!" 