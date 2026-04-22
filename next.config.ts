import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['ffmpeg-static'],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
