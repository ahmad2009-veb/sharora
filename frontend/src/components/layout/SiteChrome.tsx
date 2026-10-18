import type { ReactNode } from "react";

import { Cursor } from "@/components/motion/Cursor";
import { Preloader } from "@/components/motion/Preloader";

import { FeedbackFab } from "./FeedbackMenu";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { MobileTabBar } from "./MobileTabBar";

/** Public-site frame: header, footer and the floating feedback button. */
export async function SiteChrome({
  children,
  overlayHeader = false,
}: {
  children: ReactNode;
  overlayHeader?: boolean;
}) {
  return (
    <>
      <Preloader />
      <Header overlay={overlayHeader} />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer />
      <FeedbackFab />
      <MobileTabBar />
      <Cursor />
    </>
  );
}
