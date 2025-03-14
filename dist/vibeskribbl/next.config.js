"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false, // Disable strict mode to prevent duplicate socket connections in development
    webpack: (config) => {
        return config;
    },
};
exports.default = nextConfig;
