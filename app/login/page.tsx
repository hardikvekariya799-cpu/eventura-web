"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * EVENTURA OS — Secure Login (Modern)
 * - Forces login every app open (uses sessionStorage by default)
 * - Optional "Remember on this device" toggle (uses localStorage if enabled)
 * - Hardcoded demo credentials (change anytime)
 *
 * IMPORTANT: For real production, move credentials to env/database.
 */

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string; email: string };

const SESSION_KEY = "eventura-session-user";
const REMEMBER_KEY = "eventura-remember-user";

/** ✅ CHANGE THESE PASSWORDS ANYTIME */
const ACCOUNTS = [
  {
    role: "CEO" as const,
    email: "ceo@eventura.com",
    password: "Eventura@2026",
    name: "Hardik Vekariya",
    city: "Surat",
  },
  {
    role: "Staff" as const,
    email: "staff@eventura.com",
    password: "Staff@2026",
    name: "Eventura Staff",
    city: "Surat",
  },
];

function loadRemembered(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [capsLock, setCapsLock] = useState(false);

  const hints = useMemo(
    () => ({
      ceo: `CEO → ceo@eventura.com / Eventura@2026`,
      staff: `Staff → staff@eventura.com / Staff@2026`,
    }),
    []
  );

  // If user already has a session, redirect to dashboard
  useEffect(() => {
    if (typeof window === "undefined") return;

    // session first (forces login again after browser close)
    const sessionRaw = window.sessionStorage.getItem(SESSION_KEY);
    if (sessionRaw) {
      window.location.href = "/";
      return;
    }

    // optional remember
    const remembered = loadRemembered();
    if (remembered) {
      setEmail(remembered.email);
      setRemember(true);
    }
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const eClean = email.trim().toLowerCase();
    const pClean = password;

    const found = ACCOUNTS.find(
      (a) => a.email.toLowerCase() === eClean && a.password === pClean
    );

    if (!found) {
      setError("Invalid email or password.");
      return;
    }

    const user: User = {
      name: found.name,
      role: found.role,
      city: found.city,
      email: found.email,
    };

    // ✅ Force login on every app open: sessionStorage
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));

    // Optional remember email/user (NOT password)
    if (remember) {
      window.localStorage.setItem(REMEMBER_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(REMEMBER_KEY);
    }

    window.location.href = "/";
  };

  const shell: React.CSSProperties = {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 18,
    background:
      "radial-gradient(1200px 600px at 10% 10%, rgba(212,175,55,0.12), transparent 45%), radial-gradient(900px 500px at 90% 30%, rgba(139,92,246,0.12), transparent 55%), #070A12",
    color: "#E5E7EB",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial',
  };

  const card: React.CSSProperties = {
    width: "min(980px, 100%)",
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(10, 16, 32, 0.88)",
    boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
    overflow: "hidden",
    display: "grid",
    gridTemplateColumns: "1.05fr 0.95fr",
  };

  const left: React.CSSProperties = {
    padding: 26,
    borderRight: "1px solid rgba(255,255,255,0.10)",
    background:
      "linear-gradient(180deg, rgba(212,175,55,0.08), rgba(139,92,246,0.06))",
  };

  const right: React.CSSProperties = {
    padding: 26,
    background:
      "radial-gradient(700px 300px at 60% 20%, rgba(212,175,55,0.10), transparent 60%)",
  };

  const input: React.CSSProperties = {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.25)",
    color: "#F9FAFB",
    outline: "none",
    fontSize: 14,
  };

  const btn: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.16)",
    background:
      "linear-gradient(90deg, rgba(212,175,55,0.95), rgba(250,204,21,0.90))",
    color: "#0B1020",
    fontWeight: 800,
    cursor: "pointer",
  };

  const btnGhost: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#E5E7EB",
    cursor: "pointer",
    fontSize: 13,
  };

  return (
    <div style={shell}>
      <div style={card}>
        <div style={left}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                height: 44,
                width: 44,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                background:
                  "linear-gradient(135deg, rgba(212,175,55,0.9), rgba(139,92,246,0.7))",
                color: "#0B1020",
                fontWeight: 900,
              }}
            >
              E
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>Eventura OS</div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>
                Secure Login • Royal Ops Dashboard
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.1 }}>
              Welcome back.
            </div>
            <div style={{ marginTop: 8, fontSize: 14, opacity: 0.85 }}>
              Sign in to manage team capacity, events, vendors, leads, finance
              and reports.
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.22)",
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              Demo Credentials
            </div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>{hints.ceo}</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}>
              {hints.staff}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              Tip: You can change passwords inside <b>ACCOUNTS</b> in this file.
            </div>
          </div>

          <div style={{ marginTop: 18, fontSize: 12, opacity: 0.75 }}>
            Security mode: <b>Session login</b> (asks password again after you
            close the browser). Optional “Remember” only saves email.
          </div>
        </div>

        <div style={right}>
          <form onSubmit={onSubmit}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Sign in</div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>
              Enter your Eventura credentials
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6 }}>
                Email
              </div>
              <input
                style={input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ceo@eventura.com"
                autoComplete="username"
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6 }}>
                Password
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <input
                  style={input}
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCapsLock((e as any).getModifierState?.("CapsLock") || false)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  style={btnGhost}
                  onClick={() => setShowPass((s) => !s)}
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>

              {capsLock && (
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
                  ⚠ Caps Lock is ON
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, opacity: 0.9 }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember email on this device
              </label>

              <button
                type="button"
                style={btnGhost}
                onClick={() => {
                  setEmail("ceo@eventura.com");
                  setPassword("Eventura@2026");
                }}
              >
                Autofill CEO
              </button>
            </div>

            {error && (
              <div
                style={{
                  marginTop: 12,
                  padding: 10,
                  borderRadius: 14,
                  border: "1px solid rgba(248,113,113,0.35)",
                  background: "rgba(248,113,113,0.12)",
                  color: "#FCA5A5",
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            <button style={btn} type="submit" onClick={() => setError(null)}>
              Login
            </button>

            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
              Need logout? Go to Dashboard and click <b>Logout</b>.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
