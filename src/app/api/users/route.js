import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/User";
import { requireSessionUser, hashPassword } from "@/lib/session";
import { createUserSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

function withoutHash(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  delete obj.passwordHash;
  return obj;
}

export async function GET() {
  try {
    await requireSessionUser(["admin"]);
    await dbConnect();
    const users = await User.find({}).select("-passwordHash").sort({ createdAt: 1 }).lean();
    return NextResponse.json({ users });
  } catch (err) {
    if (err && typeof err.status === "number") {
      return NextResponse.json(
        { error: err.error || "Unauthorized" },
        { status: err.status }
      );
    }
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json().catch(() => ({}));

    const existingCount = await User.countDocuments();
    let data;

    if (existingCount === 0) {
      const parsed = createUserSchema.safeParse({ ...body, role: "admin" });
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues?.[0]?.message || "Invalid input" },
          { status: 400 }
        );
      }
      data = parsed.data;
      data.role = "admin";
    } else {
      await requireSessionUser(["admin"]);
      const parsed = createUserSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues?.[0]?.message || "Invalid input" },
          { status: 400 }
        );
      }
      data = parsed.data;
    }

    const dupe = await User.findOne({ username: data.username });
    if (dupe) {
      return NextResponse.json({ error: "Username already exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(data.password);
    const created = await User.create({
      username: data.username,
      name: data.name,
      role: data.role,
      passwordHash,
      active: true,
    });

    return NextResponse.json(withoutHash(created), { status: 201 });
  } catch (err) {
    if (err && typeof err.status === "number") {
      return NextResponse.json(
        { error: err.error || "Unauthorized" },
        { status: err.status }
      );
    }
    if (err && err.name === "ValidationError") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
