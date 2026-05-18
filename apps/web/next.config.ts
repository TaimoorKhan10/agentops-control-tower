import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the API URL to be set at build time or runtime
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  },
};

export default nextConfig;
