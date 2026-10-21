"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

/**
 * Unit and room names come from the API in whatever language the admin typed them
 * (the seed uses Tajik: "Хонаи 3", "Ҳуҷраи хоб", "Ҳ/Б"). Known names are shown in the
 * site language; anything else (a custom name) is shown as entered.
 */

const APARTMENT_NAME = /^(?:хонаи|хона|квартира|кв\.?)\s*№?\s*(\d+)$/i;
const SHOP_NAME = /^(?:мағозаи|мағоза|магазин)\s*№?\s*(\d+)$/i;

type RoomKey =
  "living" | "bedroom" | "kitchen" | "hall" | "bathroom" | "balcony" | "salesFloor" | "storage";

const ROOMS: Record<string, RoomKey> = {
  "ҳуҷраи умумӣ": "living",
  меҳмонхона: "living",
  гостиная: "living",
  "общая комната": "living",
  "ҳуҷраи хоб": "bedroom",
  спальня: "bedroom",
  ошхона: "kitchen",
  кухня: "kitchen",
  даҳлез: "hall",
  прихожая: "hall",
  "ҳ/б": "bathroom",
  "ҳаммом ва ҳоҷатхона": "bathroom",
  "с/у": "bathroom",
  санузел: "bathroom",
  "ч/к": "balcony",
  балкон: "balcony",
  "толори савдо": "salesFloor",
  "торговый зал": "salesFloor",
  анбор: "storage",
  склад: "storage",
};

const normalize = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

/** `unitName("Хонаи 3")` → "Квартира 3" on the Russian site, "Хонаи 3" on the Tajik one. */
export function useUnitName() {
  const t = useTranslations("apartments");
  return useCallback(
    (name: string) => {
      const value = normalize(name);
      const apartment = value.match(APARTMENT_NAME);
      if (apartment) return t("unitName", { n: apartment[1] });
      const shop = value.match(SHOP_NAME);
      if (shop) return t("shopName", { n: shop[1] });
      return name;
    },
    [t],
  );
}

/** `roomName("Ҳ/Б")` → "Санузел" / "Ҳаммом ва ҳоҷатхона". */
export function useRoomName() {
  const t = useTranslations("roomNames");
  return useCallback(
    (name: string) => {
      const key = ROOMS[normalize(name)];
      return key ? t(key) : name;
    },
    [t],
  );
}
