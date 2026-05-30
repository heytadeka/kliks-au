/** @type {import('next').NextConfig} */
const nextConfig = {
  // On Vercel the @vercel/next builder scopes its output to the audit/
  // subdirectory, so static assets are served from /audit/_next/* in URL space.
  // assetPrefix makes Next.js embed those URLs in the HTML it generates.
  // Locally (next dev / next build without VERCEL=1) we leave it undefined
  // so assets resolve at /_next/* on localhost as normal.
  assetPrefix: process.env.VERCEL ? '/audit' : undefined,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig
