/** @type {import("next").NextConfig} */
const nextConfig = {
  webpack(config) {
    config.amd = {
      ...(typeof config.amd === "object" ? config.amd : {}),
      toUrlUndefined: true,
    };

    return config;
  },
};

export default nextConfig;
