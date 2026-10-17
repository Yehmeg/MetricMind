/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'http://127.0.0.1:8000/:path*',
      },
    ];
  },
  webpack(config) {
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },
};

module.exports = nextConfig;