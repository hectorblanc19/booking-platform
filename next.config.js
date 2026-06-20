/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    turbo: {
      rules: {
        "*.css": {
          loaders: ["postcss-loader"],
        },
      },
    },
  },
};

module.exports = nextConfig;
