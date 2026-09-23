import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "");
}

export async function proxy(request) {
  const token = request.cookies.get("cafe_session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const { pathname } = request.nextUrl;
    if (pathname === "/admin" && payload.role !== "admin") {
      return NextResponse.redirect(new URL("/order", request.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/", request.url));
  }
}

export const config = {
  matcher: ["/order", "/display", "/admin"],
};
