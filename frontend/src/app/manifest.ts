import type { MetadataRoute } from "next";

import { site } from "@/content/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.seo.siteName} — ${site.brand.project.ru}`,
    short_name: site.seo.siteName,
    description: site.seo.description.ru,
    start_url: "/",
    display: "browser",
    background_color: "#131B2E",
    theme_color: "#131B2E",
    lang: "ru",
    icons: [
      { src: "/icon-48.png", sizes: "48x48", type: "image/png" },
      { src: "/icon-96.png", sizes: "96x96", type: "image/png" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  };
}
