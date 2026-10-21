import { notFound } from "next/navigation";

// Unknown paths render [locale]/not-found.tsx (localized, with the site chrome)
// instead of Next's built-in English 404.
export default function CatchAll() {
  notFound();
}
