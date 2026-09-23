"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [users, setUsers] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("waiter");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [rowBusy, setRowBusy] = useState(null);
  const [resetId, setResetId] = useState(null);
  const [resetPw, setResetPw] = useState("");
  const [showResetPw, setShowResetPw] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [rowError, setRowError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const fetchUsers = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const res = await fetch("/api/users");
      if (res.status === 401) {
        router.push("/");
        return;
      }
      if (res.status === 403) {
        setListError("Admin only");
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      setListError("Could not load users · try again");
    } finally {
      setListLoading(false);
    }
  }, [router]);

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
        const u = data?.user;
        if (!u) {
          router.push("/");
          return;
        }
        if (u.role !== "admin") {
          router.push("/order");
          return;
        }
        if (!cancelled) {
          setUser(u);
          setAuthChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) router.push("/");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (authChecked) fetchUsers();
  }, [authChecked, fetchUsers]);

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

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    if (!name.trim() || !username.trim() || !password) return;
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          password,
          role,
        }),
      });
      if (res.status === 401) {
        router.push("/");
        return;
      }
      if (res.status === 403) {
        setFormError("Admin only");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setFormError(data?.error || "Could not create user");
        return;
      }
      const data = await res.json().catch(() => null);
      setFormSuccess(`Created @${data?.user?.username || username.trim()}`);
      setName("");
      setUsername("");
      setPassword("");
      setRole("waiter");
      fetchUsers();
      setTimeout(() => setFormSuccess(""), 3200);
    } catch {
      setFormError("Network error · try again");
    } finally {
      setCreating(false);
    }
  }

  async function patchUser(id, payload) {
    setRowBusy(id);
    setRowError("");
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        router.push("/");
        return;
      }
      if (res.status === 403) {
        setRowError("Admin only");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setRowError(data?.error || "Update failed");
        return;
      }
      await fetchUsers();
    } catch {
      setRowError("Network error · try again");
    } finally {
      setRowBusy(null);
    }
  }

  async function handleDeactivate(id, active) {
    await patchUser(id, { active: !active });
  }

  async function handleDelete(id) {
    setRowBusy(id);
    setRowError("");
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.status === 401) {
        router.push("/");
        return;
      }
      if (res.status === 403) {
        setRowError("Admin only");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setRowError(data?.error || "Delete failed");
        return;
      }
      setDeleteId(null);
      await fetchUsers();
    } catch {
      setRowError("Network error · try again");
    } finally {
      setRowBusy(null);
    }
  }

  async function handleResetPassword(id) {
    if (!resetPw || resetPw.length < 8) {
      setRowError("New password must be at least 8 characters");
      return;
    }
    await patchUser(id, { password: resetPw });
    setResetId(null);
    setResetPw("");
    setShowResetPw(false);
  }

  if (!authChecked) {
    return (
      <main className="relative flex-1 flex flex-col min-h-dvh dawn-bg items-center justify-center px-6">
        <span className="label-mono rise">Checking admin access…</span>
      </main>
    );
  }

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
                User admin
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {user && (
              <span className="chip" title={`Signed in as ${user.username}`}>
                <span className="block w-1.5 h-1.5 rounded-full bg-success pulse-dot" />
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
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 px-5 md:px-10 py-10 max-w-5xl mx-auto w-full space-y-8 rise">
        {/* (a) Create user */}
        <section className="card overflow-hidden">
          <div className="px-6 py-4 bg-espresso text-cream flex items-center justify-between">
            <span className="label-mono-ink text-cream">Create user</span>
            <span className="label-mono text-cream/70">waiter · admin</span>
          </div>
          <form onSubmit={handleCreate} className="px-6 py-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="new-name" className="label-mono block mb-2">
                  Display name
                </label>
                <input
                  id="new-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  required
                  className="w-full bg-cream-soft px-4 py-3 rounded-xl font-ui text-base text-espresso
                             placeholder:text-latte placeholder:italic focus:outline-none focus:ring-2 focus:ring-terracotta/40"
                />
              </div>
              <div>
                <label htmlFor="new-username" className="label-mono block mb-2">
                  Username
                </label>
                  <input
                    id="new-username"
                    type="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="next"
                    value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. maria"
                  required
                  className="w-full bg-cream-soft px-4 py-3 rounded-xl font-ui text-base text-espresso
                             placeholder:text-latte placeholder:italic focus:outline-none focus:ring-2 focus:ring-terracotta/40"
                />
              </div>
              <div>
                <label htmlFor="new-password" className="label-mono block mb-2">
                  Password · min 8
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
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
              <div>
                <label htmlFor="new-role" className="label-mono block mb-2">
                  Role
                </label>
                <select
                  id="new-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-cream-soft px-4 py-3 rounded-xl font-ui text-base text-espresso
                             focus:outline-none focus:ring-2 focus:ring-terracotta/40"
                >
                  <option value="waiter">waiter</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>

            {formError && (
              <p className="font-ui text-sm font-semibold text-terracotta-deep">{formError}</p>
            )}
            {formSuccess && (
              <p className="font-ui text-sm font-semibold text-success">{formSuccess}</p>
            )}

            <button
              type="submit"
              disabled={!name.trim() || !username.trim() || !password || creating}
              className="btn-primary w-full sm:w-auto px-8 py-4 text-xs uppercase tracking-[0.2em]"
            >
              {creating ? "Creating…" : "Create user"}
              <span aria-hidden>→</span>
            </button>
          </form>
        </section>

        {/* (b) Users list */}
        <section className="card p-6 md:p-8">
          <div className="flex items-baseline justify-between gap-4">
            <div className="flex items-baseline gap-3">
              <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-espresso text-cream font-mono text-[10px] tracking-wider">
                {users.length}
              </span>
              <h2 className="font-display italic text-2xl leading-none text-espresso">
                Staff accounts
              </h2>
            </div>
            <button
              type="button"
              onClick={fetchUsers}
              className="label-mono hover:text-terracotta transition-colors"
            >
              Refresh
            </button>
          </div>

          {rowError && (
            <p className="mt-4 font-ui text-sm font-semibold text-terracotta-deep">{rowError}</p>
          )}
          {listError && (
            <p className="mt-4 font-ui text-sm font-semibold text-terracotta-deep">{listError}</p>
          )}

          <div className="mt-4 space-y-3">
            {listLoading ? (
              <p className="label-mono fade">Loading users…</p>
            ) : users.length === 0 ? (
              <p className="label-mono fade">No users yet</p>
            ) : (
              users.map((u) => (
                <article
                  key={u._id}
                  className="ticket-in rounded-2xl border border-foam bg-paper px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-lg text-espresso leading-tight">
                        {u.name}
                      </span>
                      <span
                        className={`font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-full ${
                          u.role === "admin"
                            ? "bg-espresso text-cream"
                            : "bg-cream-soft text-mocha"
                        }`}
                      >
                        {u.role}
                      </span>
                      <span
                        className={`font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-full ${
                          u.active ? "bg-success text-cream" : "bg-foam text-mocha"
                        }`}
                      >
                        {u.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="label-mono mt-1.5">
                      @{u.username}
                      {u.createdAt
                        ? ` · since ${new Date(u.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={rowBusy === u._id}
                      onClick={() =>
                        patchUser(u._id, {
                          role: u.role === "admin" ? "waiter" : "admin",
                        })
                      }
                      className="chip hover:border-terracotta hover:text-terracotta transition-colors disabled:opacity-50"
                    >
                      → {u.role === "admin" ? "waiter" : "admin"}
                    </button>
                    <button
                      type="button"
                      disabled={rowBusy === u._id}
                      onClick={() => handleDeactivate(u._id, u.active)}
                      className="chip hover:border-terracotta hover:text-terracotta transition-colors disabled:opacity-50"
                    >
                      {rowBusy === u._id
                        ? "…"
                        : u.active
                          ? "Deactivate"
                          : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRowError("");
                        setResetId(resetId === u._id ? null : u._id);
                        setResetPw("");
                        setShowResetPw(false);
                        setDeleteId(null);
                      }}
                      className="chip hover:border-terracotta hover:text-terracotta transition-colors"
                    >
                      Reset pw
                    </button>
                    {deleteId === u._id ? (
                      <>
                        <button
                          type="button"
                          disabled={rowBusy === u._id}
                          onClick={() => handleDelete(u._id)}
                          className="chip bg-terracotta-deep text-cream border-terracotta-deep hover:brightness-110 transition-colors disabled:opacity-50"
                        >
                          {rowBusy === u._id ? "…" : "Confirm delete"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteId(null);
                            setRowError("");
                          }}
                          className="chip"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={rowBusy === u._id}
                        onClick={() => {
                          setRowError("");
                          setDeleteId(u._id);
                          setResetId(null);
                        }}
                        className="chip hover:border-terracotta-deep hover:text-terracotta-deep transition-colors disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {resetId === u._id && (
                    <div className="w-full flex flex-col sm:flex-row items-stretch gap-2 fade">
                      <div className="relative flex-1">
                        <input
                          type={showResetPw ? "text" : "password"}
                          autoComplete="new-password"
                          value={resetPw}
                          onChange={(e) => setResetPw(e.target.value)}
                          placeholder="New password · min 8"
                          minLength={8}
                          className="w-full bg-cream-soft px-4 py-3 pr-20 rounded-xl font-ui text-sm text-espresso
                                     placeholder:text-latte placeholder:italic focus:outline-none focus:ring-2 focus:ring-terracotta/40"
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetPw((v) => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg
                                     font-mono text-[10px] uppercase tracking-[0.18em] text-mocha
                                     hover:text-terracotta hover:bg-paper transition-colors"
                        >
                          {showResetPw ? "Hide" : "Show"}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={rowBusy === u._id || !resetPw}
                          onClick={() => handleResetPassword(u._id)}
                          className="px-5 rounded-xl bg-espresso text-cream font-ui text-xs font-semibold uppercase tracking-wider
                                     disabled:opacity-30 hover:bg-terracotta transition-colors"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResetId(null);
                            setResetPw("");
                            setShowResetPw(false);
                          }}
                          className="chip"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
