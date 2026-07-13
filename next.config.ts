import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure firebase-admin (and its native/CJS-only runtime dependencies) is
  // loaded via Node's own require/import at runtime instead of being
  // processed by Next's bundler. This is the current, stable API for Next.js
  // 16 (the older `experimental.serverComponentsExternalPackages` option is
  // deprecated in favor of this top-level field).
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
