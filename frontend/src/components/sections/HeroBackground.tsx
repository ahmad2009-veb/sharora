"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { preload } from "react-dom";

/**
 * Hero photo slideshow (public/hero, built by scripts/build-hero.mjs).
 *
 * Built to never stutter: only two image layers exist (current + next); the next photo is
 * downloaded and decoded before its crossfade starts; only opacity and transform animate,
 * in CSS (1.2 s crossfade + Ken Burns), and JS just switches a layer state once per slide
 * with a single setTimeout. Paused while the tab is hidden or the hero is off screen;
 * reduced motion shows hero-1 only. Slideshow state never re-renders the hero text.
 */

/** Time from one crossfade start to the next, ms. */
export const SLIDE_MS = 6000;
const MOBILE = "(max-width: 767px)";

const SLIDES = [
  { n: 1, height: 1352, position: "50% 55%" },
  { n: 2, height: 1500, position: "50% 40%" },
  { n: 3, height: 1317, position: "50% 50%" },
  { n: 4, height: 1593, position: "50% 40%" },
  { n: 5, height: 1392, position: "55% 45%" },
  { n: 6, height: 1366, position: "55% 45%" },
];
export const SLIDE_COUNT = SLIDES.length;

const src = (i: number, width: 960 | 1920) => `/hero/hero-${SLIDES[i].n}-${width}.webp`;

/** 24 px hero-1, shown under the photo until it arrives. */
const PLACEHOLDER =
  "data:image/webp;base64,UklGRs4AAABXRUJQVlA4IMIAAABQBQCdASoYABEAPtFgqE+oJSOiKAgBABoJQBbdJ3QXQUvOcI/95lvu9y5RlB5yppigq9AA/lVGzYBkpuGo0fXb4pHAg9cA8H1IVWU2eM0WSsm+2Z0HsKXdqY+2f6mJTNT4NFOC6LprLNcEALiZkgtDXh2fXjRy0+MlbLKIhR0MBmdq+EEdPhhFAMTlfyFW5WFi6jSGOrRTqqhkmDYvISMvJiOrHiDummtkNz1fsgrkPWFfc6vDxpFWHh6KCQdEtKkAAA==";

/* Current slide, shared with the hero's slide indicator without re-rendering the hero. */
let activeSlide = 0;
const listeners = new Set<() => void>();
const slideStore = {
  get: () => activeSlide,
  set(i: number) {
    activeSlide = i;
    for (const l of listeners) l();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
export const useActiveSlide = () =>
  useSyncExternalStore(slideStore.subscribe, slideStore.get, () => 0);

/** top: fading in / shown; under: previous photo, kept below until covered; idle: hidden. */
type Layer = { slide: number | null; state: "top" | "under" | "idle" };

const CSS = `
.hbg{position:absolute;inset:0;overflow:hidden;contain:layout paint;isolation:isolate;
  background:#131b2e center/cover no-repeat}
.hbg-layer{position:absolute;inset:0;opacity:0;z-index:0;backface-visibility:hidden}
.hbg-layer[data-state="under"]{opacity:1;z-index:1;will-change:transform,opacity}
.hbg-layer[data-state="top"]{opacity:1;z-index:2;will-change:transform,opacity;
  transition:opacity 1.2s ease-in-out}
.hbg-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
  object-position:var(--pos);backface-visibility:hidden;transform:translate3d(0,0,0)}
.hbg-layer[data-state="top"] .hbg-img,.hbg-layer[data-state="under"] .hbg-img{
  animation:hbg-zoom 7s ease-out forwards}
@keyframes hbg-zoom{from{transform:translate3d(0,0,0) scale(1)}
  to{transform:translate3d(0,0,0) scale(1.1)}}
@keyframes hbg-zoom-m{from{transform:translate3d(0,0,0) scale(1)}
  to{transform:translate3d(0,0,0) scale(1.06)}}
@media ${MOBILE}{.hbg-img{object-position:center}
  .hbg-layer[data-state="top"] .hbg-img,.hbg-layer[data-state="under"] .hbg-img{
    animation-name:hbg-zoom-m}}
@media (prefers-reduced-motion:reduce){.hbg-layer .hbg-img{animation:none!important}}
`;

export function HeroBackground() {
  const rootRef = useRef<HTMLDivElement>(null);
  const imgRefs = [useRef<HTMLImageElement>(null), useRef<HTMLImageElement>(null)];
  const [layers, setLayers] = useState<Layer[]>([
    { slide: 0, state: "top" },
    { slide: null, state: "idle" },
  ]);
  /** Layer (0/1) holding a freshly loaded photo that should fade in after this commit. */
  const pendingFlip = useRef<number | null>(null);
  const top = useRef(0);
  const schedule = useRef<() => void>(() => {});

  // First photo: highest priority, and phones fetch only the 960 px file.
  preload(src(0, 960), { as: "image", media: MOBILE, fetchPriority: "high" });
  preload(src(0, 1920), { as: "image", media: "(min-width: 768px)", fetchPriority: "high" });

  useEffect(() => {
    // The store outlives the component: a return visit to the home page starts at hero-1 again.
    slideStore.set(0);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: number | undefined;
    let hidden = document.hidden;
    let offscreen = false;
    let started = false;
    let cancelled = false;

    const advance = async () => {
      const next = (slideStore.get() + 1) % SLIDES.length;
      const pre = new Image();
      pre.src = src(next, matchMedia(MOBILE).matches ? 960 : 1920);
      try {
        await pre.decode();
      } catch {
        return run(); // network hiccup: try again next round
      }
      if (cancelled || hidden || offscreen) return; // resuming schedules a fresh round
      const back = 1 - top.current;
      pendingFlip.current = back;
      setLayers((l) => l.map((layer, i) => (i === back ? { slide: next, state: "idle" } : layer)));
    };

    const run = () => {
      window.clearTimeout(timer);
      if (!started || cancelled || hidden || offscreen) return;
      timer = window.setTimeout(advance, SLIDE_MS);
    };
    schedule.current = run;

    const onVisibility = () => {
      hidden = document.hidden;
      run();
    };
    const io = new IntersectionObserver(([entry]) => {
      offscreen = !entry.isIntersecting;
      run();
    });
    if (rootRef.current) io.observe(rootRef.current);
    document.addEventListener("visibilitychange", onVisibility);

    // Start only after the page has fully loaded, so the slideshow never delays first render.
    const start = () => {
      started = true;
      run();
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("load", start);
    };
  }, []);

  // The new photo is in its (hidden) layer now: make sure that element is decoded, then fade.
  useEffect(() => {
    const back = pendingFlip.current;
    if (back === null) return;
    pendingFlip.current = null;
    const img = imgRefs[back].current;
    const flip = () => {
      const slide = layers[back].slide ?? 0;
      top.current = back;
      setLayers((l) => l.map((layer, i) => ({ ...layer, state: i === back ? "top" : "under" })));
      slideStore.set(slide);
      schedule.current();
    };
    if (img) img.decode().then(flip, flip);
    else flip();
    // imgRefs are stable refs; this runs only for the commit that loaded a new photo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers]);

  return (
    <div ref={rootRef} className="hbg" style={{ backgroundImage: `url("${PLACEHOLDER}")` }}>
      <style>{CSS}</style>
      {layers.map((layer, i) => (
        <div key={i} className="hbg-layer" data-state={layer.state}>
          {layer.slide !== null && (
            <picture>
              <source media={MOBILE} srcSet={src(layer.slide, 960)} />
              <img
                ref={imgRefs[i]}
                src={src(layer.slide, 1920)}
                alt=""
                width={1920}
                height={SLIDES[layer.slide].height}
                fetchPriority={layer.slide === 0 && i === 0 ? "high" : "low"}
                decoding="async"
                className="hbg-img"
                style={{ "--pos": SLIDES[layer.slide].position } as CSSProperties}
              />
            </picture>
          )}
        </div>
      ))}
    </div>
  );
}
