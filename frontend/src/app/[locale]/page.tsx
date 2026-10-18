import { setRequestLocale } from "next-intl/server";

import { SiteChrome } from "@/components/layout/SiteChrome";
import { About } from "@/components/sections/About";
import { CtaBanner } from "@/components/sections/CtaBanner";
import { Documents } from "@/components/sections/Documents";
import { Features } from "@/components/sections/Features";
import { Genplan } from "@/components/sections/Genplan";
import { Hero } from "@/components/sections/Hero";
import { Interior } from "@/components/sections/Interior";
import { Location } from "@/components/sections/Location";

// Fully static: all content comes from src/content/site.ts, no API calls.
export const dynamic = "force-static";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <SiteChrome overlayHeader>
      <Hero />
      <About />
      <Genplan />
      <Features />
      <Interior />
      <Documents />
      <Location />
      <CtaBanner />
    </SiteChrome>
  );
}
