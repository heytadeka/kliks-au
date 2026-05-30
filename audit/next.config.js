/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/audit',
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig
