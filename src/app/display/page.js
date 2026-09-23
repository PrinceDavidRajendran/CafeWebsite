"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const TAG_CONFIG = {
  Guest: { dot: "var(--color-tag-guest)", priority: 1 },
  Pastor: { dot: "var(--color-tag-pastor)", priority: 2 },
  Elder: { dot: "var(--color-tag-elder)", priority: 3 },
  Adult: { dot: "var(--color-tag-adult)", priority: 4 },
  Youth: { dot: "var(--color-tag-youth)", priority: 5 },
  Children: { dot: "var(--color-tag-children)", priority: 6 },
};

const TAG_ORDER = ["Guest", "Pastor", "Elder", "Adult", "Youth", "Children"];

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function waiterLabel(order) {
  const name = order.waiterName || order.waiterUsername || order.createdBy || "";
  const username = order.waiterUsername || "";
  if (name && username && name !== username) return `By ${name} (@${username})`;
  if (name) return `By ${name}`;
  return "Filed in store";
}

export default function DisplayPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [servedOrders, setServedOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("active");
  const [connected, setConnected] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  // Kitchen readability mode: bigger ticket type for wall-mounted tablets
  // viewed at a distance. Persisted per device.
  const [largeText, setLargeText] = useState(false);
  const [clock, setClock] = useState(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth")
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          router.push("/");
          return;
        }
        const data = await res.json().catch(() => null);
        if (!cancelled && data?.user) setUser(data.user);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    function checkSession() {
      fetch("/api/auth").then((res) => {
        if (res.status === 401) setSessionExpired(true);
      }).catch(() => {});
    }

    function connect() {
      const es = new EventSource("/api/orders/stream");
      eventSourceRef.current = es;

      es.onopen = () => setConnected(true);

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "init" || data.type === "update") {
            setOrders(data.orders);
            setServedOrders(data.servedOrders || []);
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        // Cookies are sent automatically with EventSource; a dead stream
        // usually means a dropped connection — but verify the session in
        // case the cookie expired server-side (401 -> sign-in prompt).
        checkSession();
        setTimeout(connect, 3000);
      };
    }

    connect();
    return () => eventSourceRef.current?.close();
  }, []);

  // Tick for relative times + clock. Initial setClock is deferred via setTimeout so it doesn't
  // trigger the "synchronous setState in effect" lint rule, while still populating immediately.
  const [, setTick] = useState(0);
  useEffect(() => {
    try {
      if (localStorage.getItem("cafe-display-large") === "1") setLargeText(true);
    } catch {
      // private mode etc — stay default
    }
    const initial = setTimeout(() => setClock(new Date()), 0);
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setClock(new Date());
    }, 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, []);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {
      // still leave
    } finally {
      router.push("/");
    }
  }

  async function markServed(id) {
    // Optimistically move the order from pending to served so it appears in the
    // Served tab instantly. The PATCH is fired first; if it fails, SSE will
    // re-sync the real state on its next poll.
    const order = orders.find((o) => o._id === id);
    if (order) {
      setOrders((prev) => prev.filter((o) => o._id !== id));
      setServedOrders((prev) =>
        prev.some((o) => o._id === id) ? prev : [...prev, { ...order, status: "served" }]
      );
    }
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "served" }),
      });
      if (res.status === 401) {
        router.push("/");
      }
    } catch {
      // SSE will correct
    }
  }

  async function markPending(id) {
    // Optimistically move the order back to pending (Undo). Mirror of markServed.
    const order = servedOrders.find((o) => o._id === id);
    if (order) {
      setServedOrders((prev) => prev.filter((o) => o._id !== id));
      setOrders((prev) =>
        prev.some((o) => o._id === id) ? prev : [...prev, { ...order, status: "pending" }]
      );
    }
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pending" }),
      });
      if (res.status === 401) {
        router.push("/");
      }
    } catch {
      // SSE will correct
    }
  }

  const displayOrders = activeTab === "active" ? orders : servedOrders;

  const grouped = TAG_ORDER.map((tagName) => ({
    tag: tagName,
    config: TAG_CONFIG[tagName],
    orders: displayOrders.filter((o) => o.tag === tagName),
  })).filter((group) => group.orders.length > 0);

  const waiterCounts = [...orders, ...servedOrders].reduce((acc, o) => {
    const key = o.waiterName || o.waiterUsername || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const clockStr = clock
    ? clock.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

  const dateStr = clock
    ? clock.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "";

  return (
    <main className="relative flex-1 flex flex-col min-h-dvh dawn-bg grain">
      {/* Editorial masthead */}
      <header className="relative border-b border-foam overflow-hidden">
        {/* Glow accent */}
        <div
          aria-hidden
          className="dawn-glow pointer-events-none absolute -top-32 right-0 rounded-full opacity-60"
          style={{
            width: "30rem",
            height: "30rem",
            background:
              "radial-gradient(circle, var(--color-dawn-blush) 0%, transparent 65%)",
          }}
        />
        <div className="relative px-6 md:px-10 pt-6 pb-4 flex items-start justify-between gap-6 max-w-[1600px] mx-auto">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex chip">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full pulse-dot ${
                    connected ? "bg-success" : "bg-terracotta"
                  }`}
                />
                {connected ? "Stream live" : "Reconnecting"}
              </span>
              {user && (
                <span className="inline-flex chip" title={`Signed in as ${user.username}`}>
                  👤 {user.name} ({user.role})
                </span>
              )}
              <button
                type="button"
                onClick={() => router.push("/order")}
                className="chip hover:border-terracotta hover:text-terracotta transition-colors"
              >
                Order
              </button>
              <button
                type="button"
                onClick={() => {
                  setLargeText((v) => {
                    try {
                      localStorage.setItem("cafe-display-large", v ? "0" : "1");
                    } catch {
                      // ignore
                    }
                    return !v;
                  });
                }}
                className="chip hover:border-terracotta hover:text-terracotta transition-colors"
                aria-pressed={largeText}
                title="Toggle large text for kitchen viewing"
              >
                <span aria-hidden className="font-display italic">
                  {largeText ? "A−" : "A+"}
                </span>
                {largeText ? "Large" : "Enlarge"}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="chip hover:border-terracotta hover:text-terracotta transition-colors disabled:opacity-50"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
            <h1 className="font-display text-4xl md:text-6xl leading-[0.95] text-espresso">
              Good News{" "}
              <span
                className="italic bg-gradient-to-r from-terracotta via-caramel to-saffron bg-clip-text text-transparent"
                style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}
              >
                Cafe
              </span>
            </h1>
            <p className="label-mono mt-2">{dateStr} · service board</p>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1">
            <span className="font-mono text-4xl md:text-5xl tabular-nums tracking-tight text-espresso">
              {clockStr}
            </span>
            <span className="label-mono">Auto-refresh · 2s</span>
          </div>
        </div>

        {/* Session expired banner */}
        {sessionExpired && (
          <div className="relative px-6 md:px-10 pb-4 max-w-[1600px] mx-auto w-full">
            <div className="card px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-terracotta">
              <span className="font-ui text-sm font-semibold text-terracotta-deep">
                Session expired — sign in
              </span>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="btn-primary py-2.5 px-5 text-xs uppercase tracking-[0.18em]"
              >
                Sign in →
              </button>
            </div>
          </div>
        )}

        {/* Stat strip */}
        <div className="relative px-6 md:px-10 py-4 border-t border-foam/60 max-w-[1600px] mx-auto">
          <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
            <Stat label="Pending" value={orders.length} accent />
            <Stat label="Served today" value={servedOrders.length} />
            <Stat label="Total" value={orders.length + servedOrders.length} />
            <div className="hidden md:flex items-end justify-end">
              <span className="label-mono">Sorted by priority</span>
            </div>
          </div>
          {Object.keys(waiterCounts).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(waiterCounts).map(([name, count]) => (
                <span key={name} className="chip">
                  <span className="block w-1.5 h-1.5 rounded-full bg-caramel" />
                  {name} · {count}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="relative px-6 md:px-10 border-t border-foam max-w-[1600px] mx-auto">
          <div className="flex gap-2">
            <TabButton
              active={activeTab === "active"}
              onClick={() => setActiveTab("active")}
              label="Pending"
              count={orders.length}
            />
            <TabButton
              active={activeTab === "finished"}
              onClick={() => setActiveTab("finished")}
              label="Served"
              count={servedOrders.length}
            />
          </div>
        </div>
      </header>

      {/* Orders */}
      <section className="flex-1 px-6 md:px-10 py-10 max-w-[1600px] mx-auto w-full">
        {displayOrders.length === 0 ? (
          <EmptyState mode={activeTab} />
        ) : (
          <div className="space-y-14">
            {grouped.map((group, gi) => (
              <div key={group.tag} className="rise" style={{ animationDelay: `${gi * 60}ms` }}>
                {/* Group masthead */}
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 mb-6">
                  <span
                    className="block w-4 h-4 rounded-full shrink-0 shadow-[0_0_0_5px_color-mix(in_srgb,currentColor_15%,transparent)]"
                    style={{ background: group.config.dot, color: group.config.dot }}
                  />
                  <h2 className="font-display italic text-3xl md:text-4xl leading-none text-espresso">
                    {group.tag}
                  </h2>
                  <span className="label-mono">
                    {group.orders.length} order
                    {group.orders.length !== 1 ? "s" : ""}
                  </span>
                  <div className="flex-1 h-px bg-foam" />
                  <span className="label-mono">Priority · 0{group.config.priority}</span>
                </div>

                {/* Order tickets — fewer, roomier columns in large-text mode */}
                <div
                  className={`grid grid-cols-1 gap-4 ${
                    largeText
                      ? "sm:grid-cols-2 xl:grid-cols-3"
                      : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  }`}
                >
                  {group.orders.map((order, oi) => (
                    <OrderTicket
                      key={order._id}
                      order={order}
                      dot={group.config.dot}
                      mode={activeTab}
                      large={largeText}
                      onServed={markServed}
                      onUndo={markPending}
                      delay={oi * 40}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer rule */}
      <footer className="border-t border-foam px-6 md:px-10 py-5 flex items-center justify-between max-w-[1600px] mx-auto w-full">
        <span className="label-mono">© Good News Cafe · {new Date().getFullYear()}</span>
        <span className="label-mono">
          {activeTab === "active" ? "Sorted by priority, then arrival" : "Sorted by service order"}
        </span>
      </footer>
    </main>
  );
}

function Stat({ label, value, accent = false }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="label-mono">{label}</span>
      <span
        className={`font-display text-4xl md:text-5xl leading-none tabular-nums ${
          accent ? "text-terracotta" : "text-espresso"
        }`}
      >
        {String(value).padStart(2, "0")}
      </span>
    </div>
  );
}

function TabButton({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`relative py-4 px-5 inline-flex items-baseline gap-2 rounded-t-2xl transition-all duration-200
                  ${active
                    ? "bg-paper text-espresso shadow-[0_-2px_0_var(--color-terracotta)]"
                    : "text-mocha hover:text-espresso"}`}
    >
      <span className="font-display text-xl">{label}</span>
      <span
        className={`font-mono text-[11px] tabular-nums px-1.5 py-0.5 rounded-full
                    ${active ? "bg-espresso text-cream" : "bg-cream-soft text-mocha"}`}
      >
        {String(count).padStart(2, "0")}
      </span>
    </button>
  );
}

function EmptyState({ mode }) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[55vh]">
      <div className="text-center max-w-md fade">
        <div className="mx-auto w-20 h-20 rounded-full bg-paper border border-foam flex items-center justify-center mb-6 shadow-lg">
          <span className="text-4xl" aria-hidden>
            {mode === "active" ? "☀️" : "🫖"}
          </span>
        </div>
        <h3 className="font-display italic text-4xl mb-3 text-espresso">
          {mode === "active" ? "All clear" : "Nothing served yet"}
        </h3>
        <p className="font-ui text-base text-mocha leading-snug">
          {mode === "active"
            ? "New orders will appear here the moment they're filed."
            : "Once you mark orders as served, they'll be archived here."}
        </p>
      </div>
    </div>
  );
}

function OrderTicket({ order, dot, mode, large = false, onServed, onUndo, delay }) {
  const isServed = mode !== "active";

  return (
    <article
      className={`relative card flex flex-col group transition-transform duration-300 hover:-translate-y-1 ticket-in ${
        large ? "p-6 md:p-7" : "p-5"
      } ${isServed ? "opacity-75" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Accent edge */}
      <span
        aria-hidden
        className="absolute left-5 top-5 bottom-5 w-1 rounded-full"
        style={{ background: dot }}
      />

      {/* Ticket head */}
      <div className="flex items-baseline justify-between mb-3 pl-5">
        <span className="label-mono-ink">
          № {String(order.orderNumber).padStart(3, "0")}
        </span>
        <span className="font-mono text-xs tabular-nums text-mocha">
          {formatTime(order.createdAt)}
        </span>
      </div>

      {/* Customer */}
      <h3
        className={`font-display leading-tight mb-1 pl-5 text-espresso ${
          large ? "text-3xl md:text-4xl" : "text-2xl"
        }`}
      >
        {order.customerName}
      </h3>
      <div className="flex items-center gap-2 mb-4 pl-5">
        <span
          className="block w-1.5 h-1.5 rounded-full"
          style={{ background: dot }}
        />
        <span className="label-mono">{order.tag}</span>
      </div>

      <div className="rule-dashed mb-4 ml-5" />

      {/* Drink */}
      <div className="flex items-baseline justify-between gap-2 mb-3 pl-5">
        <span
          className={`font-display leading-tight text-espresso-soft flex items-center gap-2 ${
            large ? "text-2xl" : "text-lg"
          }`}
        >
          <span aria-hidden>{drinkGlyph(order.drink)}</span>
          {order.drink}
        </span>
        <span
          className={`font-mono bg-espresso text-cream rounded-full shrink-0 ${
            large ? "text-base px-3 py-1" : "text-sm px-2.5 py-0.5"
          }`}
        >
          {order.size}
        </span>
      </div>

      {/* Add-ons */}
      {order.addOns && order.addOns.length > 0 && (
        <ul className={`space-y-1.5 mb-4 pl-5 ${large ? "font-ui text-sm" : ""}`}>
          {order.addOns.map((addon) => (
            <li
              key={addon}
              className={`font-ui text-mocha flex items-center gap-1.5 ${
                large ? "text-sm" : "text-xs"
              }`}
            >
              <span className="text-terracotta font-bold">+</span> {addon}
            </li>
          ))}
        </ul>
      )}

      {/* Waiter attribution */}
      <p className="label-mono mt-1 mb-1 pl-5">Filed by · {waiterLabel(order)}</p>

      <div className="flex-1" />

      {/* Foot */}
      <div className="mt-3 pt-3 border-t border-foam flex flex-col gap-2 pl-5">
        <div className="flex items-center justify-between">
          <span className="label-mono">{timeAgo(order.createdAt)}</span>
          {!isServed ? (
            <button
              onClick={() => onServed(order._id)}
              className="inline-flex items-center justify-center gap-2 px-5 min-h-[48px] rounded-full bg-success text-cream
                       font-ui text-sm font-semibold uppercase tracking-wider
                       hover:brightness-110 active:scale-95 transition"
            >
              Mark served
              <span aria-hidden>✓</span>
            </button>
          ) : (
            <button
              onClick={() => onUndo(order._id)}
              className="inline-flex items-center justify-center gap-2 px-5 min-h-[48px] rounded-full bg-paper border border-foam text-espresso
                       font-ui text-sm font-semibold uppercase tracking-wider
                       hover:bg-espresso hover:text-cream hover:border-espresso active:scale-95 transition"
            >
              Undo
              <span aria-hidden>↺</span>
            </button>
          )}
        </div>
        <span className="font-ui text-xs text-mocha">{waiterLabel(order)}</span>
      </div>
    </article>
  );
}

function drinkGlyph(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("tea")) return "🍵";
  if (n.includes("milo") || n.includes("chocolate")) return "🍫";
  if (n.includes("iced")) return "🧊";
  if (n.includes("espresso")) return "⚡";
  return "☕";
}
