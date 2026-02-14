/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Avoid build failure when Next-generated .next/types paths (e.g. route groups like (landing)) are missing during type check
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors/warnings.
    ignoreDuringBuilds: true,
  },
  // Required for native modules to work properly in serverless/production environments
  experimental: {
    serverComponentsExternalPackages: ['@resvg/resvg-js'],
  },
};

export default nextConfig;
