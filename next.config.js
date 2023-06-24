const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    config.module.rules.push({
      test: /\.fnt$/,
      loader: "file-loader",
      options: {
        publicPath: "/_next",
        name: "static/fonts/[name].[hash].[ext]",
      },
    });

    return config;
  },
};

module.exports = nextConfig;
