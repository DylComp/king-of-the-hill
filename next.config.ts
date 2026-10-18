import type { NextConfig } from "next";
import path from "node:path";

// Pinned so Next never picks up a parent folder's configs.
const root = path.resolve(__dirname);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: { root },
  outputFileTracingRoot: root,
};

export default nextConfig;
