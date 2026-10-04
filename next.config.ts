import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@electric-sql/pglite",
    "playwright-core",
    "@onkernel/sdk",
    "agentmail",
    "@mastra/core",
  ],
  devIndicators: false,
};

export default nextConfig;
