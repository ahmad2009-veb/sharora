import { defineRouting } from "next-intl/routing";

// "tg" is the ISO 639-1 code for Tajik; the switcher displays it as "TJ".
export const routing = defineRouting({
  locales: ["ru", "tg"],
  defaultLocale: "ru",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
