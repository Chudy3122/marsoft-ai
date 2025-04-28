/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  images: {
    domains: [],
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Dodaj wsparcie dla wersji produkcyjnej
  assetPrefix: process.env.NODE_ENV === 'production' 
    ? 'https://marsoft-ai.vercel.app' 
    : undefined,
  webpack: (config) => {
    // Ignoruj ostrzeżenia dotyczące package.json
    config.ignoreWarnings = [
      { module: /node_modules\/node-fetch/ }
    ];
    return config;
  },
}

module.exports = nextConfig