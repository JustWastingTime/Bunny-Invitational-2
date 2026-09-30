import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "gametora.com", pathname: "/images/umamusume/characters/**" }],
  },
  async redirects() {
    return [{ source: "/maps", destination: "/", permanent: false }];
  },
};

export default nextConfig;
