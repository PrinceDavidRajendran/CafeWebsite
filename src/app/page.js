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
        <div className="lg:col-span-7 flex flex-col justify-between rise">
          <div>
            <div className="inline-flex chip mb-7">
              <span className="block w-1.5 h-1.5 rounded-full bg-terracotta pulse-dot" />
              Open · brewing since 06:30
            </div>
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
              <span className="block text-[16vw] lg:text-[7.5vw] font-light -mt-2">
                Cafe<span className="text-terracotta">.</span>
              </span>
            </h1>
          </div>

          <div className="mt-10 max-w-md">
            <p className="font-display text-xl text-espresso-soft leading-snug">
              A small kitchen run by friends. Sign in with your waiter account
              to take orders for today&rsquo;s congregation.
            </p>
            <div className="mt-6 flex items-center gap-3 text-mocha">
              <SteamCup />
              <span className="font-ui text-sm">
                Fresh pots on. The morning is yours.
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
      <footer className="relative z-10 px-6 md:px-12 py-6 flex items-center justify-between">
        <span className="label-mono">EST · 2017 · Auckland</span>
        <span className="label-mono">Sunrise Roastery · v0.2</span>
      </footer>
    </main>
  );
}

/* Tiny decorative cup with rising steam */
function SteamCup() {
  return (
    <span className="relative inline-flex items-end">
      <span className="steam relative inline-block w-6 h-6">
        <span />
        <span />
        <span />
      </span>
      <span className="text-2xl leading-none">☕</span>
    </span>
  );
}
