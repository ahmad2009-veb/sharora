import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { site, tr } from "@/content/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/** Dark top band of a subpage: visible breadcrumb, the page's <h1> and a lead paragraph. */
export function PageIntro({
  locale,
  eyebrow,
  title,
  lead,
  children,
}: {
  locale: Locale;
  eyebrow: string;
  title: string;
  lead: string;
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby="page-title" className="relative bg-ink pt-20 text-white">
      <div aria-hidden className="atmosphere" />
      <div className="relative container-page pt-10 pb-12 md:pt-14 md:pb-16">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-mist">
            <li>
              <Link href="/" className="transition-colors hover:text-gold">
                {tr(site.nav[0].label, locale)}
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="size-3.5" />
            </li>
            <li aria-current="page" className="text-gold">
              {eyebrow}
            </li>
          </ol>
        </nav>
        <h1
          id="page-title"
          className="mt-5 max-w-4xl font-display text-h2 font-extrabold tracking-tight md:text-[3.25rem] md:leading-[1.05]"
        >
          {title}
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-white/75">{lead}</p>
        {children}
      </div>
    </section>
  );
}
