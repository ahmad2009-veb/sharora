"use client";

import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Lightbox } from "@/components/ui/Lightbox";
import { site, tr } from "@/content/site";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";

/** Horizontal editorial carousel with a live "01 / 09" counter and a fullscreen lightbox. */
export function InteriorGallery({ heading }: { heading: ReactNode }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const [index, setIndex] = useState<number | null>(null);
  const [current, setCurrent] = useState(0);
  const trackRef = useRef<HTMLUListElement>(null);
  const images = site.interior.images.map((img) => ({
    src: img.src,
    alt: tr(img.alt, locale),
    tag: tr(img.tag, locale),
  }));

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const card = track.querySelector("li");
      if (!card) return;
      const step = card.clientWidth + 20;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      setCurrent(atEnd ? images.length - 1 : Math.round(track.scrollLeft / step));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [images.length]);

  function scrollBy(dir: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector("li");
    track.scrollBy({ left: dir * ((card?.clientWidth ?? 400) + 20), behavior: "smooth" });
  }

  const arrow =
    "grid size-12 place-items-center rounded-full transition-all duration-300 disabled:opacity-35";
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <>
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        {heading}
        <div className="flex items-center gap-6">
          <p className="font-display text-xl font-extrabold tabular-nums" aria-live="polite">
            <span className="text-gold-deep">{pad(current + 1)}</span>
            <span className="text-muted/50"> / {pad(images.length)}</span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className={cn(arrow, "bg-white text-ink shadow-soft hover:bg-gold")}
              onClick={() => scrollBy(-1)}
              disabled={current === 0}
              aria-label={t("previous")}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              className={cn(
                arrow,
                "bg-ink text-white shadow-lift hover:bg-gold hover:text-on-gold",
              )}
              onClick={() => scrollBy(1)}
              disabled={current === images.length - 1}
              aria-label={t("next")}
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      <ul
        ref={trackRef}
        data-lenis-prevent-horizontal
        className="mt-10 mr-[calc(50%-50vw)] flex snap-x snap-mandatory [scrollbar-width:none] gap-5 overflow-x-auto pr-[calc(50vw-50%)] pb-4 [&::-webkit-scrollbar]:hidden"
      >
        {images.map((img, i) => (
          <li
            key={img.src}
            className="w-[86%] shrink-0 snap-start sm:w-[62%] lg:w-[calc((100%-40px)/2.35)]"
          >
            <button
              type="button"
              onClick={() => setIndex(i)}
              data-cursor="view"
              className="group relative block aspect-[4/3] w-full overflow-hidden rounded-panel bg-sand-deep text-left shadow-soft"
              aria-label={`${img.alt} — ${i + 1} / ${images.length}`}
            >
              <Image
                src={img.src}
                alt=""
                fill
                sizes="(min-width: 1024px) 560px, 86vw"
                className="object-cover transition-transform duration-[1.2s] ease-out-soft group-hover:scale-[1.06]"
              />
              <span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent"
              />
              <span className="absolute right-6 bottom-6 left-6 text-white">
                <span className="block eyebrow text-gold">
                  {pad(i + 1)} · {img.tag}
                </span>
                <span className="mt-1.5 block font-display text-xl leading-snug font-extrabold md:text-2xl">
                  {img.alt}
                </span>
              </span>
              <span className="absolute top-5 right-5 grid size-11 place-items-center rounded-full bg-ink/70 text-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                <Expand className="size-[18px]" aria-hidden />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Lightbox
        images={images}
        index={index}
        onIndexChange={setIndex}
        onClose={() => setIndex(null)}
        title={tr(site.interior.eyebrow, locale)}
        caption={index !== null ? images[index]?.alt : undefined}
        labels={{ close: t("close"), previous: t("previous"), next: t("next") }}
      />
    </>
  );
}
