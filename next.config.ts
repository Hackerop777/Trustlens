import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost",
    "localhost:3000",
    "192.168.0.100",
    "192.168.0.100:3000",
  ],
};

export default nextConfig;
