"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ComponentProps } from "react";

import type { Lightbox as LightboxComponent } from "./Lightbox";

const loadLightbox = () => import("./Lightbox").then((m) => m.Lightbox);
const Lightbox = dynamic(loadLightbox, { ssr: false });

/**
 * Lightbox kept out of the initial bundle (it brings the zoom/pan library): the chunk is
 * fetched when the browser is idle after load, and mounted on the first open.
 */
export function LazyLightbox(props: ComponentProps<typeof LightboxComponent>) {
  const [used, setUsed] = useState(false);
  if (props.index !== null && !used) setUsed(true);

  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    idle(() => void loadLightbox());
  }, []);

  return used ? <Lightbox {...props} /> : null;
}
