/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  skipTrailingSlashRedirect: true,
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
