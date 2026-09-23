"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [now, setNow] = useState(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth")
      .then((res) => {
        if (cancelled) return;
        if (res.ok) router.push("/order");
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const initial = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password || loading) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      if (res.ok) {
        router.push("/order");
      } else if (res.status === 401) {
        setError("Invalid credentials");
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Sign in failed · try again");
      }
    } catch {
      setError("Network error · try again");
    } finally {
      setLoading(false);
    }
  }

  const stamp = now
    ? now.toLocaleString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <main className="relative flex-1 flex flex-col min-h-dvh dawn-bg grain overflow-hidden">
      {/* Decorative sunrise arc — sits behind everything */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="dawn-glow absolute -top-[42vw] -right-[22vw] rounded-full"
          style={{
            width: "70vw",
            height: "70vw",
            background:
              "radial-gradient(circle, var(--color-dawn-blush) 0%, var(--color-dawn-peach) 38%, transparent 65%)",
          }}
        />
        <div
          className="dawn-glow absolute -top-[28vw] -right-[8vw] rounded-full"
          style={{
            width: "34vw",
            height: "34vw",
            animationDelay: "1.5s",
            background:
              "radial-gradient(circle, var(--color-saffron) 0%, transparent 60%)",
            opacity: 0.5,
          }}
        />
      </div>

      {/* Top meta bar */}
      <header className="relative z-10 px-6 md:px-12 pt-7 flex items-center justify-between">
        <span className="inline-flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-espresso text-cream text-sm">
            ☕
          </span>
          <span className="label-mono-ink">Good News Cafe · Service</span>
        </span>
        <span className="label-mono">{stamp || "—"}</span>
      </header>

      {/* Body */}
      <section className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 px-6 md:px-12 py-10 md:py-20 max-w-[1400px] w-full mx-auto">
        {/* Left — editorial hero */}
        <div className="lg:col-span-7 flex flex-col justify-center rise">
          <div>
            <h1 className="font-display tracking-tight text-espresso leading-[0.9]">
              <span className="block text-[16vw] lg:text-[7.5vw] font-light">
                Good
              </span>
              <span
                className="block text-[16vw] lg:text-[7.5vw] italic font-light"
                style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1" }}
              >
                <span className="bg-gradient-to-r from-terracotta via-caramel to-saffron bg-clip-text text-transparent">
                  News
                </span>
              </span>
              <span className="flex items-center gap-[0.18em] text-[16vw] lg:text-[7.5vw] font-light -mt-2">
                <span>
                  Cafe<span className="text-terracotta">.</span>
                </span>
                <span className="origin-bottom-left scale-75 lg:scale-100">
                  <ServeMark />
                </span>
              </span>
            </h1>
          </div>

          <div className="mt-8 max-w-lg">
            <div>
              <p className="font-display text-2xl md:text-[2rem] text-espresso leading-[1.2]">
                &ldquo;Serve one another humbly in love.&rdquo;
              </p>
              <span className="mt-3 ml-20 flex items-center gap-2.5">
                <span aria-hidden className="block h-[2px] w-10 bg-terracotta" />
                <span className="label-mono-ink text-[12px] font-semibold">
                  Galatians 5:13
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Right — login card */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <form
            onSubmit={handleSubmit}
            className="relative card overflow-hidden rise"
            style={{ animationDelay: "120ms" }}
          >
            {/* Card header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4">
              <span className="label-mono-ink">Staff access</span>
              <span className="label-mono">
                {checking ? "Checking…" : "Waiter sign in"}
              </span>
            </div>

            <div className="px-6 pt-6 pb-6">
              <label htmlFor="username" className="label-mono block mb-1">
                Username
              </label>
              <p className="font-display text-2xl text-espresso mb-6">
                Welcome back 👋
              </p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="label-mono block mb-2">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. maria"
                    required
                    enterKeyHint="next"
                    className="w-full bg-cream-soft px-4 py-3 rounded-xl font-ui text-base text-espresso
                               placeholder:text-latte placeholder:italic focus:outline-none focus:ring-2 focus:ring-terracotta/40"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="label-mono block mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                      required
                      enterKeyHint="go"
                      className="w-full bg-cream-soft px-4 py-3 pr-20 rounded-xl font-ui text-base text-espresso
                                 placeholder:text-latte placeholder:italic focus:outline-none focus:ring-2 focus:ring-terracotta/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg
                                 font-mono text-[10px] uppercase tracking-[0.18em] text-mocha
                                 hover:text-terracotta hover:bg-paper transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 rule-dashed" />

              {error ? (
                <p className="mt-4 font-ui text-sm font-semibold text-terracotta-deep flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-terracotta-deep text-cream text-[10px]">
                    !
                  </span>
                  {error}
                </p>
              ) : (
                <p className="mt-4 label-mono">Staff only · ask an admin for access</p>
              )}
            </div>

            {/* Submit — Enter submits via native form behaviour */}
            <button
              type="submit"
              disabled={!username.trim() || !password || loading}
              className="btn-primary w-full rounded-none py-5 text-sm uppercase tracking-[0.18em]"
            >
              {loading ? "Signing in…" : "Sign in to the kitchen"}
              <span aria-hidden>→</span>
            </button>
          </form>

          <p
            className="label-mono mt-6 text-center rise"
            style={{ animationDelay: "240ms" }}
          >
            Protected · service staff only
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 md:px-12 py-6 flex items-center justify-end">
        <span className="label-mono">Sunrise Roastery · v0.2</span>
      </footer>
    </main>
  );
}

/* Serving-cup seal: a cup of love poured out at sunrise —
   dawn gradient, heart-steam, and a spark of joy. */
function ServeMark() {
  return (
    <span aria-hidden className="relative inline-flex w-20 h-20 shrink-0">
      {/* dawn glow behind the seal */}
      <span
        className="absolute -inset-3 rounded-full"
        style={{
          background:
            "radial-gradient(circle, var(--color-dawn-blush) 0%, var(--color-dawn-peach) 45%, transparent 70%)",
        }}
      />
      <span className="relative flex items-center justify-center w-20 h-20 rounded-full bg-paper border border-foam shadow-[0_14px_36px_-14px_var(--color-terracotta)] overflow-hidden">
        {/* sunrise wash inside the seal */}
        <span
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, var(--color-dawn-blush) 0%, transparent 55%)",
            opacity: 0.55,
          }}
        />
        <svg width="46" height="46" viewBox="0 0 64 64" fill="none" className="relative">
          <defs>
            <linearGradient id="sealDawn" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-terracotta)" />
              <stop offset="100%" stopColor="var(--color-saffron)" />
            </linearGradient>
          </defs>
          {/* heart rising like steam */}
          <path
            d="M32 25c-4.5-3.2-7-5.6-7-8.4 0-2 1.6-3.6 3.6-3.6 1.4 0 2.6.7 3.4 1.8.8-1.1 2-1.8 3.4-1.8 2 0 3.6 1.6 3.6 3.6 0 2.8-2.5 5.2-7 8.4z"
            fill="url(#sealDawn)"
          />
          {/* cup */}
          <rect x="20" y="31.5" width="24" height="3" rx="1.5" fill="var(--color-espresso)" />
          <path
            d="M22 37h20l-2.5 12a2 2 0 0 1-2 1.6h-11a2 2 0 0 1-2-1.6L22 37z"
            fill="var(--color-espresso)"
          />
          <path
            d="M42 38.5c3.5 0 5.5 2 5 4.8-.4 2.6-2.8 4.5-5.8 4.5"
            stroke="var(--color-espresso)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          {/* saucer */}
          <path
            d="M20 54.5h24"
            stroke="var(--color-caramel)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          {/* spark of joy */}
          <path
            d="M49 14l1.1 2.8 2.8 1.1-2.8 1.1L49 21.8l-1.1-2.8-2.8-1.1 2.8-1.1L49 14z"
            fill="var(--color-saffron)"
          />
        </svg>
        {/* stitched inner ring */}
        <span className="absolute inset-[5px] rounded-full border border-dashed border-terracotta/30 pointer-events-none" />
      </span>
    </span>
  );
}

