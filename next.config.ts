import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/dinosoar", destination: "/dinosoar.html" },
      { source: "/tremor", destination: "/tremor.html" },
    ];
  },
};

export default nextConfig;
