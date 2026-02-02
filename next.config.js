const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: process.env.NEXT_OUTPUT_MODE,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: { unoptimized: true },
};

// Only use outputFileTracingRoot in local development (Abacus environment)
if (process.env.NEXT_DIST_DIR) {
  nextConfig.experimental = {
    outputFileTracingRoot: path.join(__dirname, '../'),
  };
}

module.exports = nextConfig;
