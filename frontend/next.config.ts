import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// The browser always calls same-origin /api and /media, so the admin JWT cookie stays
// first-party. On Vercel the top-level rewrites in /vercel.json send those paths to the
// FastAPI service before Next.js sees them; locally and in Docker Next proxies them here.
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";
const proxyToBackend = !process.env.VERCEL;

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Vercel Services do not provide the /_next/image optimizer (it returns 404), so on
    // Vercel images are served straight from public/ via the CDN. Locally Next optimizes.
    unoptimized: !!process.env.VERCEL,
  },
  async rewrites() {
    if (!proxyToBackend) return [];
    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      { source: "/media/:path*", destination: `${backendUrl}/media/:path*` },
    ];
  },
};

export default withNextIntl(nextConfig);
