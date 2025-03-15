#!/bin/bash
set -e

echo "==== VibeSkribbl Deployment Script ===="

# 1. Stop any running instances
echo "Stopping any existing PM2 instances..."
npx pm2 stop vibeskribbl || true

# 2. Clear existing build artifacts
echo "Cleaning up previous builds..."
rm -rf .next dist

# 3. Set environment to production
export NODE_ENV=production

# 4. Build the Next.js application and TypeScript
echo "Building Next.js application (production mode)..."
npm run build

# 5. Verify build artifacts exist
if [ ! -d ".next" ]; then
  echo "ERROR: .next directory not found after build!"
  exit 1
fi

if [ ! -d "dist" ]; then
  echo "ERROR: dist directory not found after build!"
  exit 1
fi

# 6. Start the application with PM2 in production mode
echo "Starting application with PM2 in production mode..."
npx pm2 start ecosystem.config.js --env production

# 7. Save PM2 configuration so it survives server reboots
echo "Saving PM2 configuration..."
npx pm2 save

# 8. Display running processes and logs
echo "==== Deployment Complete ===="
echo "Running PM2 processes:"
npx pm2 list

echo "Last 10 log lines:"
npx pm2 logs vibeskribbl --lines 10

echo "Access your application at: http://YOUR_SERVER_IP:3001"
echo "To view logs continuously, run: npm run pm2:logs" 