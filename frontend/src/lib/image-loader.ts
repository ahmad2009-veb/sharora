import manifest from "@/generated/images.json";

const images: Record<string, { w: number[]; v: string }> = manifest;

/**
 * next/image loader for the WebP copies made by scripts/build-images.mjs (Vercel Services
 * have no /_next/image optimizer). Picks the smallest pre-built width that covers the
 * requested one; images without copies (API /media files, new uploads) load unchanged.
 * In development the originals are used, so new images show up without a rebuild.
 */
export default function imageLoader({ src, width }: { src: string; width: number }): string {
  // `npm run dev` does not build the copies: serve the original file.
  if (process.env.NODE_ENV === "development")
    return `${src}${src.includes("?") ? "&" : "?"}w=${width}`;
  const image = images[src];
  if (!image) return src;
  const w = image.w.find((x) => x >= width) ?? image.w[image.w.length - 1];
  return `/_img${src.replace(/\.[^.]+$/, "")}-${w}.webp?v=${image.v}`;
}
