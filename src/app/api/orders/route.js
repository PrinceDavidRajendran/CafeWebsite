import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Order, { TAG_PRIORITY } from "@/lib/Order";
import { requireSessionUser } from "@/lib/session";
import { nextSequence } from "@/lib/Counter";
import { awstDateParts, startOfAWSTDay } from "@/lib/day";

export const dynamic = "force-dynamic";

const TAGS = ["Guest", "Pastor", "Elder", "Adult", "Youth", "Children"];
const SIZES = ["S", "M", "L"];

export async function GET() {
  try {
    await requireSessionUser(["admin", "waiter"]);
    await dbConnect();
    const start = startOfAWSTDay(new Date());

    const orders = await Order.find({ status: "pending" })
      .sort({ priority: 1, createdAt: 1 })
      .lean();

    const completedOrders = await Order.find({ status: "completed" })
      .sort({ priority: 1, createdAt: 1 })
      .lean();

    const servedOrders = await Order.find({
      status: "served",
      createdAt: { $gte: start },
    })
      .sort({ priority: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({ orders, completedOrders, servedOrders });
  } catch (err) {
    if (err && typeof err.status === "number") {
      return NextResponse.json(
        { error: err.error || "Unauthorized" },
        { status: err.status }
      );
    }
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user: sessionUser } = await requireSessionUser(["admin", "waiter"]);

    const body = await request.json().catch(() => ({}));

    const customerName =
      typeof body.customerName === "string" ? body.customerName.trim() : "";
    if (!customerName || customerName.length > 60) {
      return NextResponse.json(
        { error: "customerName must be 1-60 characters" },
        { status: 400 }
      );
    }

    if (!TAGS.includes(body.tag)) {
      return NextResponse.json({ error: "Invalid tag" }, { status: 400 });
    }

    const drink = typeof body.drink === "string" ? body.drink.trim() : "";
    if (!drink || drink.length > 60) {
      return NextResponse.json(
        { error: "drink must be 1-60 characters" },
        { status: 400 }
      );
    }

    if (!SIZES.includes(body.size)) {
      return NextResponse.json({ error: "Invalid size" }, { status: 400 });
    }

    let addOns = [];
    if (body.addOns !== undefined) {
      if (!Array.isArray(body.addOns) || body.addOns.length > 6) {
        return NextResponse.json(
          { error: "addOns must be an array of at most 6 items" },
          { status: 400 }
        );
      }
      for (const a of body.addOns) {
        if (typeof a !== "string" || !a.trim() || a.trim().length > 40) {
          return NextResponse.json(
            { error: "Each addOn must be 1-40 characters" },
            { status: 400 }
          );
        }
      }
      addOns = body.addOns.map((a) => a.trim());
    }

    await dbConnect();

    const { y, m, dt } = awstDateParts(new Date());
    const orderNumber = await nextSequence(`orders:${y}-${m}-${dt}`);

    const order = await Order.create({
      orderNumber,
      customerName,
      tag: body.tag,
      priority: TAG_PRIORITY[body.tag],
      drink,
      size: body.size,
      addOns,
      status: "pending",
      createdBy: new mongoose.Types.ObjectId(sessionUser.id),
      waiterUsername: sessionUser.username,
      waiterName: sessionUser.name,
    });

    return NextResponse.json(order, { status: 201 });
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
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
