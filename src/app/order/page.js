"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const DRINKS = [
  "Espresso",
  "Latte",
  "Cappuccino",
  "Long Black",
  "Flat White",
  "Hot Chocolate",
  "Iced Chocolate",
  "Iced Coffee",
  "Iced Milo",
  "Wagh Bakri Special Tea",
];

const SIZES = ["S", "M", "L"];

const TAGS = [
  { label: "Guest", dot: "var(--color-tag-guest)" },
  { label: "Pastor", dot: "var(--color-tag-pastor)" },
  { label: "Elder", dot: "var(--color-tag-elder)" },
  { label: "Adult", dot: "var(--color-tag-adult)" },
  { label: "Youth", dot: "var(--color-tag-youth)" },
  { label: "Children", dot: "var(--color-tag-children)" },
];

const ADD_ONS = [
  "Whipped Cream",
  "Less Condensed Milk",
  "Extra Sugar",
  "Ice Cream",
  "Marshmallow",
];

export default function OrderPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [tag, setTag] = useState("");
  const [drink, setDrink] = useState("");
  const [size, setSize] = useState("M");
  const [addOns, setAddOns] = useState([]);
  const [customAddOn, setCustomAddOn] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [toast, setToast] = useState(null);

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

  function toggleAddOn(addon) {
    setAddOns((prev) =>
      prev.includes(addon) ? prev.filter((a) => a !== addon) : [...prev, addon]
    );
  }

  function addCustomAddOn() {
    const value = customAddOn.trim();
    if (value && !addOns.includes(value)) {
      setAddOns((prev) => [...prev, value]);
    }
    setCustomAddOn("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!customerName.trim() || !tag || !drink || !size) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          tag,
          drink,
          size,
          addOns,
        }),
      });

      if (res.status === 401) {
        router.push("/");
        return;
      }

      if (res.ok) {
        const order = await res.json();
        setToast(
          `№ ${String(order.orderNumber).padStart(3, "0")} · ${order.customerName} · filed`
        );
        setCustomerName("");
        setTag("");
        setDrink("");
        setSize("M");
        setAddOns([]);
        setCustomAddOn("");
        setTimeout(() => setToast(null), 3200);
      }
    } catch {
      setToast("Network failure · try again");
      setTimeout(() => setToast(null), 3200);
    } finally {
      setSubmitting(false);
    }
  }

  const ready = customerName.trim() && tag && drink && size;
  const customAddOns = addOns.filter((a) => !ADD_ONS.includes(a));

  return (
    <main className="relative flex-1 flex flex-col min-h-dvh dawn-bg">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-foam">
        <div className="max-w-5xl mx-auto px-5 md:px-10 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-espresso text-cream shrink-0">
              ☕
            </span>
            <div className="flex flex-col min-w-0">
              <span className="label-mono-ink">Good News Cafe</span>
              <span className="font-display italic text-xl leading-none mt-0.5">
                Take an order
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {user && (
              <span
                className="chip max-w-[46vw] sm:max-w-none"
                title={`Signed in as ${user.username}`}
              >
                <span className="block w-1.5 h-1.5 rounded-full bg-success pulse-dot shrink-0" />
                <span className="truncate">
                  👤 {user.name} ({user.role})
                </span>
              </span>
            )}
            {user?.role === "admin" && (
              <button
                type="button"
                onClick={() => router.push("/admin")}
                className="chip hover:border-terracotta hover:text-terracotta transition-colors"
              >
                Admin
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push("/display")}
              className="chip hover:border-terracotta hover:text-terracotta transition-colors"
            >
              Display
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="chip hover:border-terracotta hover:text-terracotta transition-colors disabled:opacity-50"
            >
              <span className="block w-1.5 h-1.5 rounded-full bg-mocha" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50 toast-in
                      w-max max-w-[calc(100vw-2rem)] px-5 py-3 rounded-2xl bg-espresso text-cream text-center
                      font-mono text-xs uppercase tracking-[0.22em]
                      shadow-[0_18px_40px_-12px_rgba(42,26,18,0.6)]"
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-saffron mr-2 align-middle pulse-dot" />
          {toast}
        </div>
      )}

      {/* Form */}
      <form
        id="order-form"
        onSubmit={handleSubmit}
        className="flex-1 px-5 md:px-10 py-10 pb-40 max-w-5xl mx-auto w-full space-y-8 rise"
      >
        {/* SECTION 01 — Customer */}
        <section className="card p-6 md:p-8">
          <SectionHeader index="01" title="Customer" />
          <div className="relative mt-4">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Name on the order"
              required
              autoComplete="off"
              autoCapitalize="words"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              maxLength={60}
              className="w-full bg-transparent border-0 border-b-2 border-foam
                         px-0 pt-3 pb-3 text-2xl md:text-3xl font-display text-espresso
                         placeholder:text-latte placeholder:italic
                         focus:outline-none focus:border-terracotta transition-colors"
            />
            <span className="absolute right-0 bottom-4 label-mono">
              {customerName.length || 0} chr
            </span>
          </div>
        </section>

        {/* SECTION 02 — Tag */}
        <section className="card p-6 md:p-8">
          <SectionHeader index="02" title="Tag" meta="Who's it for?" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            {TAGS.map((t) => {
              const active = tag === t.label;
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setTag(t.label)}
                  className={`group relative flex items-center gap-3 px-4 py-4 rounded-2xl text-left
                              transition-all duration-200
                              ${active
                                ? "bg-espresso text-cream shadow-lg -translate-y-0.5"
                                : "bg-cream-soft text-espresso hover:bg-foam/40 hover:-translate-y-0.5"}`}
                  style={active ? { boxShadow: `0 10px 24px -10px ${t.dot}` } : {}}
                >
                  <span
                    className="block w-3 h-3 rounded-full shrink-0 transition-transform group-hover:scale-125"
                    style={{
                      background: t.dot,
                      boxShadow: `0 0 0 3px ${active ? "rgba(255,253,247,0.25)" : "transparent"}`,
                    }}
                  />
                  <span className="font-display text-lg leading-none">{t.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* SECTION 03 — Drink */}
        <section className="card p-6 md:p-8">
          <SectionHeader
            index="03"
            title="Drink"
            meta={drink ? `Selected · ${drink}` : `${DRINKS.length} on the menu`}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {DRINKS.map((d, i) => {
              const active = drink === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDrink(d)}
                  className={`relative flex items-center justify-between px-5 py-4 rounded-2xl
                              text-left transition-all duration-200
                              ${active
                                ? "bg-gradient-to-br from-terracotta to-caramel-deep text-cream shadow-lg -translate-y-0.5"
                                : "bg-cream-soft text-espresso hover:bg-foam/40 hover:-translate-y-0.5"}`}
                >
                  <span className="font-display text-lg leading-tight flex items-center gap-2.5">
                    <span aria-hidden>{drinkGlyph(d)}</span>
                    {d}
                  </span>
                  <span
                    className={`font-mono text-[10px] tabular-nums tracking-wider px-2 py-1 rounded-full
                                ${active ? "bg-cream/20 text-cream" : "bg-paper text-mocha"}`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* SECTION 04 — Size */}
        <section className="card p-6 md:p-8">
          <SectionHeader index="04" title="Size" />
          <div className="grid grid-cols-3 gap-3 mt-4">
            {SIZES.map((s) => {
              const active = size === s;
              const labels = { S: "Small", M: "Medium", L: "Large" };
              const cups = { S: "🥛", M: "☕", L: "🍵" };
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`flex flex-col items-center justify-center gap-2 py-6 rounded-2xl
                              transition-all duration-200
                              ${active
                                ? "bg-espresso text-cream shadow-lg -translate-y-0.5"
                                : "bg-cream-soft text-espresso hover:bg-foam/40 hover:-translate-y-0.5"}`}
                >
                  <span className="text-3xl leading-none" aria-hidden>
                    {cups[s]}
                  </span>
                  <span className="font-display text-3xl leading-none">{s}</span>
                  <span className={`label-mono ${active ? "text-cream/70" : ""}`}>
                    {labels[s]}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* SECTION 05 — Add-ons */}
        <section className="card p-6 md:p-8">
          <SectionHeader
            index="05"
            title="Add-ons"
            meta={addOns.length ? `${addOns.length} added` : "Optional"}
          />
          <div className="flex flex-wrap gap-2.5 mt-4">
            {ADD_ONS.map((addon) => {
              const active = addOns.includes(addon);
              return (
                <button
                  key={addon}
                  type="button"
                  onClick={() => toggleAddOn(addon)}
                  className={`group inline-flex items-center gap-2 px-4 py-2.5 rounded-full border-2 transition-all duration-200
                              ${active
                                ? "bg-caramel text-cream border-caramel shadow-md"
                                : "bg-paper text-espresso border-foam hover:border-caramel hover:-translate-y-0.5"}`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] transition-colors
                                ${active ? "bg-cream text-caramel" : "bg-cream-soft text-mocha"}`}
                  >
                    {active ? "✓" : "+"}
                  </span>
                  <span className="font-ui text-sm font-medium leading-none">
                    {addon}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom add-on row */}
          <div className="mt-5 flex items-stretch gap-2">
            <input
              type="text"
              value={customAddOn}
              onChange={(e) => setCustomAddOn(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomAddOn();
                }
              }}
              placeholder="Custom note · e.g. no foam"
              className="flex-1 bg-cream-soft px-4 py-3 rounded-xl font-ui text-base text-espresso
                         placeholder:text-latte placeholder:italic focus:outline-none focus:ring-2 focus:ring-terracotta/40"
            />
            <button
              type="button"
              onClick={addCustomAddOn}
              disabled={!customAddOn.trim()}
              className="px-5 rounded-xl bg-espresso text-cream font-ui text-sm font-semibold uppercase tracking-wider
                         disabled:opacity-30 disabled:cursor-not-allowed
                         hover:bg-terracotta transition-colors"
            >
              Add
            </button>
          </div>

          {customAddOns.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2.5">
              {customAddOns.map((addon) => (
                <span
                  key={addon}
                  className="inline-flex items-center gap-2 pl-3.5 pr-1.5 py-1.5 rounded-full bg-paper border border-foam"
                >
                  <span className="block w-1.5 h-1.5 rounded-full bg-terracotta" aria-hidden />
                  <span className="font-ui text-sm leading-none">{addon}</span>
                  <button
                    type="button"
                    onClick={() => toggleAddOn(addon)}
                    className="ml-1 w-6 h-6 inline-flex items-center justify-center rounded-full text-mocha
                               hover:bg-terracotta hover:text-cream transition-colors"
                    aria-label={`Remove ${addon}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Summary preview */}
        {ready && (
          <section className="card overflow-hidden fade">
            <div className="px-6 py-4 bg-espresso text-cream flex items-center justify-between">
              <span className="label-mono-ink text-cream">Receipt · preview</span>
              <span className="label-mono text-cream/70">awaiting filing</span>
            </div>
            <div className="px-6 py-6 space-y-4">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-display text-3xl text-espresso">
                  {customerName}{" "}
                  <span className="italic text-mocha text-xl">· {tag}</span>
                </span>
              </div>
              <div className="rule-dashed" />
              <div className="flex items-baseline justify-between font-ui">
                <span className="text-lg text-espresso-soft flex items-center gap-2">
                  <span aria-hidden>{drinkGlyph(drink)}</span>
                  {drink}{" "}
                  <span className="text-mocha">({size})</span>
                </span>
                <span className="label-mono">x1</span>
              </div>
              {addOns.length > 0 && (
                <ul className="pl-4 space-y-1.5 font-ui text-sm text-mocha">
                  {addOns.map((a) => (
                    <li key={a} className="flex items-center gap-2">
                      <span className="text-terracotta">+</span> {a}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </form>

      {/* Sticky submit */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-foam glass z-40 safe-bottom">
        <div className="max-w-5xl mx-auto px-5 md:px-10 pt-4 pb-4 flex items-center gap-4">
          <div className="hidden sm:flex flex-col">
            <span className="label-mono">Items</span>
            <span className="font-display text-3xl leading-none mt-1 text-espresso">
              {ready ? "1" : "—"}
            </span>
          </div>
          <button
            type="submit"
            form="order-form"
            disabled={!ready || submitting}
            className="btn-primary flex-1 py-5 text-sm uppercase tracking-[0.2em]"
          >
            {submitting ? "Filing…" : "Send to kitchen"}
            <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </main>
  );
}

function SectionHeader({ index, title, meta }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div className="flex items-baseline gap-3">
        <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-espresso text-cream font-mono text-[10px] tracking-wider">
          {index}
        </span>
        <h2 className="font-display italic text-2xl leading-none text-espresso">{title}</h2>
      </div>
      {meta ? <span className="label-mono text-right">{meta}</span> : null}
    </div>
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
