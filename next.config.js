/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: [],
    unoptimized: true, // Dodaj tę linię
  },
  // Dodaj tę konfigurację
  experimental: {
    outputStandalone: true,
  },
  // Upewnij się, że zmienne środowiskowe są poprawnie skonfigurowane
  env: {
    NEXT_PUBLIC_HUGGINGFACE_API_KEY: process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY,
  },
}

module.exports = nextConfig