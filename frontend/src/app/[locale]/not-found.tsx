import { getTranslations } from "next-intl/server";

import { SiteChrome } from "@/components/layout/SiteChrome";
import { buttonClasses } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("common");
  const ta = await getTranslations("apartments");
  return (
    <SiteChrome>
      <title>{t("notFoundTitle")}</title>
      <section className="bg-sand pt-[72px]">
        <div className="container-page flex min-h-[60vh] flex-col items-start justify-center py-20">
          <p className="eyebrow text-gold-deep">404</p>
          <h1 className="mt-4 font-display text-h2 font-bold">{t("notFoundTitle")}</h1>
          <p className="mt-4 max-w-lg text-muted">{t("notFoundText")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/" className={buttonClasses("secondary")}>
              {t("toHome")}
            </Link>
            <Link href="/apartments" className={buttonClasses("primary")}>
              {ta("title")}
            </Link>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
