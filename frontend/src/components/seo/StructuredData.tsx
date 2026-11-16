import { site, tr } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import { absoluteUrl } from "@/lib/seo";
import { SITE_URL } from "@/lib/site-url";

// schema.org JSON-LD for search engines (Google rich results, Yandex). Server components: the
// <script> is in the static HTML, not injected by client JavaScript. Everything comes from
// src/content/site.ts, so contact details and names stay in one place.

const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const COMPLEX_ID = `${SITE_URL}/#complex`;

const phone = site.contact.phoneHref.replace("tel:", "");

function JsonLd({ data }: { data: object }) {
  // `<` is escaped so text from site.ts can never close the script tag.
  const json = JSON.stringify({ "@context": "https://schema.org", ...data }).replace(
    /</g,
    "\\u003c",
  );
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

function address(locale: Locale) {
  return {
    "@type": "PostalAddress",
    addressCountry: "TJ",
    addressRegion: locale === "ru" ? "Согдийская область" : "Вилояти Суғд",
    addressLocality: tr(site.contact.address, locale),
  };
}

const geo = {
  "@type": "GeoCoordinates",
  latitude: site.contact.map.lat,
  longitude: site.contact.map.lon,
};

/** Every page (rendered by the locale layout): site name for Google + the company. */
export function SiteStructuredData({ locale }: { locale: Locale }) {
  return (
    <JsonLd
      data={{
        "@graph": [
          {
            // Google reads `name` here as the site name shown above the URL in results.
            "@type": "WebSite",
            "@id": WEBSITE_ID,
            name: site.seo.siteName,
            alternateName: site.seo.siteAlternateNames,
            url: SITE_URL,
            inLanguage: locale === "ru" ? "ru-RU" : "tg-TJ",
            publisher: { "@id": ORG_ID },
          },
          {
            "@type": ["RealEstateAgent", "HomeAndConstructionBusiness"],
            "@id": ORG_ID,
            name: site.seo.siteName,
            legalName: site.brand.name,
            alternateName: [...site.seo.alternateNames, site.brand.name, site.brand.wordmark],
            url: SITE_URL,
            logo: {
              "@type": "ImageObject",
              url: `${SITE_URL}/icon-192.png`,
              width: 192,
              height: 192,
            },
            image: `${SITE_URL}/og.jpg`,
            description: tr(site.seo.description, locale),
            slogan: tr(site.brand.tagline, locale),
            telephone: phone,
            address: address(locale),
            geo,
            areaServed: {
              "@type": "Country",
              name: locale === "ru" ? "Таджикистан" : "Тоҷикистон",
            },
            openingHoursSpecification: {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
              opens: "09:00",
              closes: "18:00",
            },
            contactPoint: {
              "@type": "ContactPoint",
              telephone: phone,
              contactType: "sales",
              areaServed: "TJ",
              availableLanguage: ["ru", "tg"],
              url: absoluteUrl(locale, site.pages.contacts.path),
            },
            makesOffer: {
              "@type": "Offer",
              url: absoluteUrl(locale, "/apartments"),
              businessFunction: "http://purl.org/goodrelations/v1#Sell",
              availability: "https://schema.org/InStock",
              itemOffered: {
                "@type": "Apartment",
                name: locale === "ru" ? "Квартиры от 42 до 103 м²" : "Хонаҳо аз 42 то 103 м²",
                numberOfRooms: { "@type": "QuantitativeValue", minValue: 1, maxValue: 4 },
                containedInPlace: { "@id": COMPLEX_ID },
                floorSize: {
                  "@type": "QuantitativeValue",
                  minValue: 42,
                  maxValue: 103,
                  unitCode: "MTK",
                },
              },
            },
          },
        ],
      }}
    />
  );
}

/** Home and /about: the residential complex itself. */
export function ComplexStructuredData({ locale }: { locale: Locale }) {
  return (
    <JsonLd
      data={{
        "@type": "ApartmentComplex",
        "@id": COMPLEX_ID,
        name: tr(site.brand.project, locale),
        alternateName: site.seo.alternateNames,
        description: tr(site.seo.description, locale),
        url: absoluteUrl(locale),
        image: `${SITE_URL}/og.jpg`,
        address: address(locale),
        geo,
        // 2 blocks × floors 2–9 × 7 flats; floor 1 is shops.
        numberOfAccommodationUnits: 112,
        amenityFeature: site.features.items.map((item) => ({
          "@type": "LocationFeatureSpecification",
          name: tr(item.title, locale),
          value: true,
        })),
        containedInPlace: {
          "@type": "AdministrativeArea",
          name:
            locale === "ru" ? "Айнинский район, Согдийская область" : "Ноҳияи Айнӣ, вилояти Суғд",
        },
      }}
    />
  );
}

/** Subpages: Главная › <page>. */
export function BreadcrumbStructuredData({
  locale,
  path,
  name,
}: {
  locale: Locale;
  path: string;
  name: string;
}) {
  return (
    <JsonLd
      data={{
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: tr(site.nav[0].label, locale),
            item: absoluteUrl(locale),
          },
          { "@type": "ListItem", position: 2, name, item: absoluteUrl(locale, path) },
        ],
      }}
    />
  );
}
