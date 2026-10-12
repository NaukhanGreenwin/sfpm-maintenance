import type { NextConfig } from "next";

// Preview lives at naukhangreenwin.github.io/sfpm-maintenance.
// For maintenance.stressfreepm.ca (served at the root) build with BASE_PATH="".
const basePath = process.env.BASE_PATH ?? "/sfpm-maintenance";

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  poweredByHeader: false,
};

export default nextConfig;
