import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Order from "@/lib/Order";
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
    if (body.status !== "pending" && body.status !== "served") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await dbConnect();
    const order = await Order.findByIdAndUpdate(
      id,
      {
        status: body.status,
        // Stamp serve time for future fulfilment-time stats; clear it on Undo
        // so a re-served order measures its latest cycle.
        servedAt: body.status === "served" ? new Date() : null,
      },
      { new: true }
    );

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
