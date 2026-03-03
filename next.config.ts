import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  turbopack: {
    root: process.cwd(),
  },
  // Compress responses
  compress: true,
  // Power header
  poweredByHeader: false,
}

export default nextConfig
