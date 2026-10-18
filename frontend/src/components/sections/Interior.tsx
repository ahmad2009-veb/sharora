import { getLocale } from "next-intl/server";

import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { site, tr } from "@/content/site";
import type { Locale } from "@/i18n/routing";

import { InteriorGallery } from "./InteriorGallery";

export async function Interior() {
  const locale = (await getLocale()) as Locale;
  return (
    <section
      id="interior"
      aria-labelledby="interior-title"
      className="overflow-hidden bg-sand section-y"
    >
      <Reveal className="container-page">
        <InteriorGallery
          heading={
            <SectionHeading
              id="interior-title"
              eyebrow={tr(site.interior.eyebrow, locale)}
              title={tr(site.interior.title, locale)}
              subtitle={tr(site.interior.subtitle, locale)}
            />
          }
        />
      </Reveal>
    </section>
  );
}
