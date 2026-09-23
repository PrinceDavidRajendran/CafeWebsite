import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/User";
import { requireSessionUser, hashPassword } from "@/lib/session";
import { updateUserSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

function withoutHash(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  delete obj.passwordHash;
  return obj;
}

export async function PATCH(request, { params }) {
  try {
    const { user: sessionUser } = await requireSessionUser(["admin"]);

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const isSelf = sessionUser.id === id || sessionUser.sub === id;

    if (isSelf) {
      if (data.active === false) {
        return NextResponse.json(
          { error: "Cannot deactivate your own account" },
          { status: 400 }
        );
      }
      if (data.role && data.role !== "admin") {
        return NextResponse.json(
          { error: "Cannot demote your own account" },
          { status: 400 }
        );
      }
    }

    if (data.role && !["admin", "waiter"].includes(data.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const update = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.role !== undefined) update.role = data.role;
    if (data.active !== undefined) update.active = data.active;
    if (data.password !== undefined) {
      update.passwordHash = await hashPassword(data.password);
    }

    await dbConnect();
    const updated = await User.findByIdAndUpdate(id, update, { new: true });
    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(withoutHash(updated));
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
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { user: sessionUser } = await requireSessionUser(["admin"]);

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const isSelf = sessionUser.id === id || sessionUser.sub === id;
    if (isSelf) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    await dbConnect();
    const target = await User.findById(id);
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Never orphan the system: refuse to delete the last active admin.
    if (target.role === "admin" && target.active) {
      const otherAdmins = await User.countDocuments({
        _id: { $ne: target._id },
        role: "admin",
        active: true,
      });
      if (otherAdmins === 0) {
        return NextResponse.json(
          { error: "Cannot delete the last active admin" },
          { status: 400 }
        );
      }
    }

    // Hard delete. Past orders keep their waiterUsername/waiterName
    // snapshots, so order history stays intact.
    await User.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err && typeof err.status === "number") {
      return NextResponse.json(
        { error: err.error || "Unauthorized" },
        { status: err.status }
      );
    }
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
