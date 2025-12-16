"use client";

import React, { useMemo, useState } from "react";

type Role = "CEO" | "Staff";

const USER_KEY = "eventura-user";
const SESSION_KEY = "eventura-session";

/**
 * ✅ Login users:
 * - ceo@eventura.com / Eventura@2026  -> CEO
 * - staff@eventura.com / Eventura@2026 -> Staff
 *
 * ✅ Session storage = asks login again when browser is closed/reopened
 * (sessionStorage clears on full close)
 */
export default function LoginPage() {
  const [email, setEmail] = useState("ceo@eventura.com");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const demo = useMemo(
    () => [
      { role: "CEO" as Role, email: "ceo@eventura.com", pass: "Eventura@2026" },
      { role: "Staff" as Role, email: "staff@eventura.com", pass: "Eventura@2026" },
    ],
    []
  );

  const validate = (e: string, p: string): { ok: boolean; role?: Role } => {
    const normalized = e.trim().toLowerCase();
    const match = demo.find((d) => d.email === normalized && d.pass === p);
    if (!match) return { ok: false };
    return { ok: true, role: match.role };
  };

  const login = async () => {
    setError(null);
    setBusy(true);

    try {
      const res = validate(email, password);
      if (!res.ok || !res.role) {
        setError("Invalid email or password");
        setBusy(false);
        return;
      }

      const user = {
        name: res.role === "CEO" ? "Hardik Vekariya" : "Eventura Staff",
        role: res.role,
        city: "Surat",
      };

      // ✅ Always ask login on new app open:
      // Session storage token (clears on browser close)
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ ok: true, ts: Date.now() })
      );

      // Keep user identity for pages (can be localStorage)
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      window.location.href = "/";
    } finally {
      setBusy(false);
    }
  };

  const fill = (role: Role) => {
    const x = demo.find((d) => d.role === role)!;
    setEmail(x.email);
    setPassword(x.pass);
    setError(null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 bg-[#050816]">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl p-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-yellow-300/30 to-purple-500/20 border border-white/10 flex items-center justify-center text-xl">
            E
          </div>
          <div>
            <div className="text-white text-xl font-semibold tracking-tight">
              Eventura OS
            </div>
            <div className="text-white/60 text-sm">
              Secure Login · Royal Admin Panel
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div>
            <label className="text-white/70 text-sm">Email</label>
            <input
              className="mt-1 w-full rounded-2xl bg-black/30 border border-white/10 text-white px-4 py-3 outline-none focus:border-yellow-300/40"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ceo@eventura.com"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-white/70 text-sm">Password</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                className="w-full rounded-2xl bg-black/30 border border-white/10 text-white px-4 py-3 outline-none focus:border-yellow-300/40"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                onKeyDown={(e) => {
                  if (e.key === "Enter") login();
                }}
              />
              <button
                className="rounded-2xl px-3 py-3 bg-white/5 border border-white/10 text-white/80 hover:text-white"
                onClick={() => setShowPass((s) => !s)}
                type="button"
                title="Show/Hide"
              >
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl bg-red-500/10 border border-red-400/20 text-red-200 text-sm px-4 py-3">
              {error}
            </div>
          )}

          <button
            disabled={busy}
            onClick={login}
            className="mt-2 w-full rounded-2xl bg-gradient-to-r from-yellow-300/35 to-purple-500/25 border border-white/10 text-white font-semibold py-3 hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Logging in..." : "Login"}
          </button>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fill("CEO")}
              className="rounded-2xl bg-white/5 border border-white/10 text-white/80 hover:text-white px-3 py-2 text-sm"
            >
              Use CEO Demo
            </button>
            <button
              type="button"
              onClick={() => fill("Staff")}
              className="rounded-2xl bg-white/5 border border-white/10 text-white/80 hover:text-white px-3 py-2 text-sm"
            >
              Use Staff Demo
            </button>
          </div>

          <div className="text-white/50 text-xs mt-3 leading-relaxed">
            Tip: Closing the browser will require login again (secure mode).
          </div>
        </div>
      </div>
    </div>
  );
}
