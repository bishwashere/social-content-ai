/** @type {import('next').NextConfig} */
const nextConfig = {
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
