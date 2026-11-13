import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "bs_session";

const authSecret = process.env.AUTH_SECRET || "";
const secret = () => new TextEncoder().encode(authSecret);

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  let session: { role?: string } | null = null;
  if (token && authSecret.length >= 32) {
    try {
      const { payload } = await jwtVerify(token, secret(), {
        issuer: "brave-skill",
        audience: "brave-skill-web",
      });
      session = { role: payload.role as string };
    } catch {
      session = null;
    }
  }

  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin = pathname.startsWith("/admin");

  if ((isDashboard || isAdmin) && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (isAdmin && session && session.role === "STUDENT") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isDashboard && session && session.role !== "STUDENT") {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
