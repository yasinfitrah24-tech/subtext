/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow importing JSON files from outside the web directory
  // (eval/results.json is at the workspace root)
  experimental: {},
};

module.exports = nextConfig;
