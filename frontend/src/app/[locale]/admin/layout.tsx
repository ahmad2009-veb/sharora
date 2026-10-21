import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

// Internal tool for sales managers: Russian only, never indexed.
export const metadata: Metadata = {
  title: "Админ-панель",
  robots: { index: false, follow: false },
};

// Lets the phone layout pad its top bar and bottom navigation for the notch / home indicator.
export const viewport: Viewport = { viewportFit: "cover" };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-[100svh] bg-sand">{children}</div>;
}
