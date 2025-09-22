/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Disable static generation for pages that use client-side features
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
}

export default nextConfig
