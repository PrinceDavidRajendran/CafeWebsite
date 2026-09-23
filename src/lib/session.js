import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "cafe_session";
export const SESSION_MAX_AGE = 12 * 3600; // 12 hours in seconds

function resolveSecret(providedSecret) {
  const secret = providedSecret ?? process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET is not configured. Define JWT_SECRET in your environment."
    );
  }
  return new TextEncoder().encode(secret);
}

function toSessionUser(user) {
  return {
    id: String(user.id ?? user._id),
    username: user.username,
    name: user.name,
    role: user.role,
  };
}

export async function signSessionToken(user, secret) {
  const key = resolveSecret(secret);
  return new SignJWT(toSessionUser(user))
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key);
}

export async function verifySessionToken(token, secret) {
  if (!token) return null;
  try {
    const key = resolveSecret(secret);
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    if (!payload?.id || !payload?.username || !payload?.role) return null;
    return {
      id: String(payload.id),
      username: payload.username,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  };
}

export async function getSessionUser(secret) {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token, secret);
}

export async function requireSessionUser(allowedRoles = [], secret) {
  const user = await getSessionUser(secret);
  if (!user) {
    throw { error: "Unauthorized", status: 401 };
  }
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    throw { error: "Forbidden", status: 403 };
  }
  return { user };
}

// ---------------------------------------------------------------------------
// Node-only password helpers (bcryptjs). Do NOT import these from Edge
// middleware — import only `verifySessionToken` there (jose is edge-safe).
// These use dynamic imports so bundling this module into middleware never
// pulls bcryptjs in unless the functions are actually called.
// ---------------------------------------------------------------------------

export async function hashPassword(password) {
  const { default: bcrypt } = await import("bcryptjs");
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password, passwordHash) {
  const { default: bcrypt } = await import("bcryptjs");
  if (!password || !passwordHash) return false;
  try {
    return await bcrypt.compare(password, passwordHash);
  } catch {
    return false;
  }
}
