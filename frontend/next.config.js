const { nextui } = require('@nextui-org/react');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      encoding: require.resolve("encoding"),
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:8716/api/v1/:path*'
      }
    ]
  }
};

module.exports = nextConfig;