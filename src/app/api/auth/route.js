import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/User";
import {
  SESSION_COOKIE,
  getSessionUser,
  sessionCookieOptions,
  signSessionToken,
  verifyPassword,
} from "@/lib/session";
import { safeParseLogin } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rateLimit";

// Dummy bcrypt hash used to equalize timing when the user does not exist,
// is inactive, or has no stored hash. Not a real credential.
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

function getClientIp(request, username) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();
  return ip || username || "unknown";
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    },
  });
}

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const parsed = safeParseLogin(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const { username, password } = parsed.data;

    const rate = checkRateLimit(
      `login:${getClientIp(request, username)}`,
      10,
      60 * 1000
    );
    if (!rate.ok) {
      return NextResponse.json(
        { error: "Too many attempts, try again later" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
        }
      );
    }

    await dbConnect();

    const user = await User.findOne({ username }).select("+passwordHash");

    // Always run a bcrypt comparison to equalize timing (no user enumeration).
    const hashToCheck = user?.passwordHash ?? DUMMY_HASH;
    const passwordOk = await verifyPassword(password, hashToCheck);

    if (!user || !user.active || !user.passwordHash || !passwordOk) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await signSessionToken({
      id: String(user._id),
      username: user.username,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: String(user._id),
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
