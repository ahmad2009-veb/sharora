import type { ReactNode } from "react";

import "./globals.css";

// <html> and <body> are rendered by app/[locale]/layout.tsx so that `lang` follows the locale.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
