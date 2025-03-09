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
};

module.exports = nextConfig;