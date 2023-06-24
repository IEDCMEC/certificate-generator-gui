const nextConfig = {
  reactStrictMode: true,
  // Add your custom configurations here
  async rewrites() {
    return [
      {
        source: '/fonts/:path*',
        destination: '/public/fonts/:path*',
      },
    ];
  },
  // Add other custom configurations if needed
  output: "standalone"
};

module.exports = nextConfig;