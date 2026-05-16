/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {serverActionsBodySizeLimit: '2mb',
    // App Router ist default in Next.js 14
  },
  // Yahoo Finance calls gehen über interne API route
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
        ],
      },
    ];
  },
// Serverless Functions Region
export const config = {
  runtime: 'edge',
  regions: ['fra1'],};

module.exports = nextConfig;
