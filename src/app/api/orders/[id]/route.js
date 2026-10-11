import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Order, { ORDER_STATUSES } from "@/lib/Order";
import { requireSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  try {
    await requireSessionUser(["admin", "waiter"]);

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    if (!ORDER_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await dbConnect();

    // Lifecycle: pending -> completed (kitchen made it) -> served (handed to a
    // waiter). Backwards moves (Undo) are allowed, and clear the stamps so a
    // re-run measures its latest cycle.
    const now = new Date();
    const updates = { status: body.status };
    if (body.status === "completed") {
      updates.completedAt = now;
      updates.servedAt = null;
    } else if (body.status === "served") {
      updates.servedAt = now;
    } else {
      updates.completedAt = null;
      updates.servedAt = null;
    }

    const order = await Order.findByIdAndUpdate(id, updates, { new: true });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (err) {
    if (err && typeof err.status === "number") {
      return NextResponse.json(
        { error: err.error || "Unauthorized" },
        { status: err.status }
      );
    }
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
