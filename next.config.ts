import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.tildacdn.pro',
      },
    ],
  },
};

export default nextConfig;
