import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
// `ANALYZE=true npm run build` writes treemaps to .next/analyze/ (loaded only then, so
// dev and normal builds never need the package).
const withBundleAnalyzer: (config: NextConfig) => NextConfig =
  process.env.ANALYZE === "true"
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("@next/bundle-analyzer")({ enabled: true })
    : (config) => config;

// The browser always calls same-origin /api and /media, so the admin JWT cookie stays
// first-party. On Vercel the top-level rewrites in /vercel.json send those paths to the
// FastAPI service before Next.js sees them; locally and in Docker Next proxies them here.
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";
const proxyToBackend = !process.env.VERCEL;

const IMMUTABLE = "public, max-age=31536000, immutable";
const DAY = "public, max-age=86400, stale-while-revalidate=604800";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: {
    // Vercel Services do not provide the /_next/image optimizer (it returns 404), so resized
    // WebP copies are pre-built by scripts/build-images.mjs (part of `npm run build`) and
    // picked by this loader — the same files locally and on Vercel.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    // Keep in sync with WIDTHS in scripts/build-images.mjs.
    deviceSizes: [640, 828, 1080, 1280, 1920],
    imageSizes: [64, 128, 256, 384],
  },
  async headers() {
    return [
      // Resized copies are addressed with a content hash (?v=…): safe to keep for a year.
      { source: "/_img/:path*", headers: [{ key: "Cache-Control", value: IMMUTABLE }] },
      // Other public files keep their names when replaced: a day, then revalidate.
      ...["/renders/:path*", "/docs/:path*", "/fonts/:path*", "/logo.png", "/og.jpg"].map(
        (source) => ({ source, headers: [{ key: "Cache-Control", value: DAY }] }),
      ),
    ];
  },
  async rewrites() {
    if (!proxyToBackend) return [];
    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      { source: "/media/:path*", destination: `${backendUrl}/media/:path*` },
    ];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
