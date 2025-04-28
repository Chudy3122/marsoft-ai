/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  images: {
    domains: [],
    unoptimized: true,
  },
  // Usuń assetPrefix jeśli jest obecny
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Dodaj output: 'standalone' - to jest KLUCZOWE dla wdrożenia na Vercel
  output: 'standalone',
  poweredByHeader: false
}

module.exports = nextConfig