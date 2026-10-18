import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

type Messages = { [key: string]: string | Messages };

// Missing Tajik keys fall back to Russian (TODO: complete tg.json).
function withFallback(base: Messages, override: Messages): Messages {
  const result: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const baseValue = base[key];
    result[key] =
      typeof value === "object" && typeof baseValue === "object"
        ? withFallback(baseValue, value)
        : value;
  }
  return result;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const ru = (await import("../messages/ru.json")).default as Messages;
  const messages =
    locale === "ru"
      ? ru
      : withFallback(ru, (await import(`../messages/${locale}.json`)).default as Messages);
  return { locale, messages };
});
