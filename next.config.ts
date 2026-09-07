import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [{ source: "/maps", destination: "/", permanent: false }];
  },
};

export default nextConfig;
