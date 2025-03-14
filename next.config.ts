import type { Configuration as WebpackConfig } from 'webpack';
import type { NextConfig } from 'next';

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  reactStrictMode: false, // Disable strict mode to prevent duplicate socket connections in development
  eslint: {
    // Disable ESLint during build
    ignoreDuringBuilds: true,
  },
  webpack: (config: WebpackConfig) => {
    return config;
  },
};

export default nextConfig;
