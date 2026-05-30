/** @type {import('next').NextConfig} */
// cache-bust: 2026-05-30
const nextConfig = {
  assetPrefix: '/audit',
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig
