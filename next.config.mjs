/** @type {import('next').NextConfig} */
const nextConfig = {
  // Redirect to /projects page from / route
  async redirects() {
    return [
      {
        source: "/",
        destination: "/project",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
