import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const ADMIN_COOKIE = "sharora_admin_token";
const ADMIN_PATH = /^\/(?:tg\/)?admin(?:\/(?!login).*)?$/;

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Cheap presence check only — the API validates the JWT on every admin call.
  if (ADMIN_PATH.test(pathname) && !request.cookies.has(ADMIN_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|media|_next|_vercel|.*\\..*).*)"],
};
