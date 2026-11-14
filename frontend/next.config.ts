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

const isDev = process.env.NODE_ENV === "development";
// Origin of NEXT_PUBLIC_API_URL when the browser calls FastAPI directly; empty = same origin.
const apiOrigin = process.env.NEXT_PUBLIC_API_URL
  ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
  : "";
// Uploaded photos live in Vercel Blob (absolute URLs stored in the database).
const BLOB_IMAGES = "https://*.public.blob.vercel-storage.com";

// Next.js and the preloader inject inline scripts; nonces would make every page dynamic, so
// scripts are limited to this origin + inline. Everything else is locked to what the site uses.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${BLOB_IMAGES} ${apiOrigin}`,
  "font-src 'self' data:",
  `connect-src 'self' blob: data: ${apiOrigin}${isDev ? " ws: wss:" : ""}`,
  "worker-src 'self' blob:",
  // Location section: OpenStreetMap embed.
  "frame-src https://www.openstreetmap.org",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
]
  .map((d) => d.replace(/\s+/g, " ").trim())
  .join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Browsers ignore HSTS over plain http, so localhost `next start` is unaffected.
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

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
    deviceSizes: [640, 720, 828, 1080, 1280, 1920],
    imageSizes: [64, 128, 256, 384],
  },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
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
