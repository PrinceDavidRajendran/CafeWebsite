import { jwtVerify } from "jose";
import dbConnect from "@/lib/mongodb";
import Order from "@/lib/Order";
import { SESSION_COOKIE } from "@/lib/session";
import { startOfAWSTDay } from "@/lib/day";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Keep the SSE stream alive as long as the plan allows (Hobby caps at 60s).
// The client auto-reconnects (display/page.js), so expiry just causes a
// brief reconnect, not data loss.
export const maxDuration = 60;

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "");
}

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

export async function GET(request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const token = getCookieValue(cookieHeader, SESSION_COOKIE);
    if (!token) {
      return new Response("Unauthorized", { status: 401 });
    }
    try {
      await jwtVerify(token, getSecret());
    } catch {
      return new Response("Unauthorized", { status: 401 });
    }

    await dbConnect();

    const encoder = new TextEncoder();
    let closed = false;
    let interval;
    let heartbeat;

    const stream = new ReadableStream({
      async start(controller) {
        try {
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
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "init", orders, completedOrders, servedOrders })}\n\n`
            )
          );
        } catch {
          controller.close();
          return;
        }

        interval = setInterval(async () => {
          if (closed) {
            clearInterval(interval);
            return;
          }
          try {
          const start = startOfAWSTDay(new Date());
            const currentOrders = await Order.find({ status: "pending" })
              .sort({ priority: 1, createdAt: 1 })
              .lean();
            const currentCompleted = await Order.find({ status: "completed" })
              .sort({ priority: 1, createdAt: 1 })
              .lean();
            const currentServed = await Order.find({
              status: "served",
              createdAt: { $gte: start },
            })
              .sort({ priority: 1, createdAt: 1 })
              .lean();
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "update", orders: currentOrders, completedOrders: currentCompleted, servedOrders: currentServed })}\n\n`
              )
            );
          } catch {
            clearInterval(interval);
          }
        }, 2000);

        heartbeat = setInterval(() => {
          if (closed) {
            clearInterval(heartbeat);
            return;
          }
          try {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch {
            clearInterval(heartbeat);
          }
        }, 15000);
      },
      cancel() {
        closed = true;
        if (interval) clearInterval(interval);
        if (heartbeat) clearInterval(heartbeat);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }
}
