import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  basePath: "/group/three/3",
  images: { unoptimized: true },
  turbopack: { root: process.cwd() },
};

export default nextConfig;
