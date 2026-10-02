import path from "node:path";

import type { NextConfig } from "next";

const apiProxyTarget = process.env.API_PROXY_TARGET?.replace(/\/+$/, "");

if (apiProxyTarget && new URL(apiProxyTarget).port) {
  throw new Error(
    "API_PROXY_TARGET must not include a port; use a hostname that serves the API on 80/443",
  );
}

const monorepoRoot = path.join(import.meta.dirname, "../..");

const nextConfig: NextConfig = {
  output: "standalone",

  reactCompiler: true,

  outputFileTracingRoot: monorepoRoot,

  allowedDevOrigins: ["127.0.0.1"],

  async rewrites() {
    if (!apiProxyTarget) {
      return [];
    }

    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiProxyTarget}/api/v1/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${apiProxyTarget}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;