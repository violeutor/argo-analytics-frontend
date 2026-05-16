/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
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
};

module.exports = nextConfig;
