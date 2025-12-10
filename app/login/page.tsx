"use client";

import React, { useState } from "react";

type Role = "CEO" | "Staff";

type UserRecord = {
  email: string;
  password: string;
  name: string;
  role: Role;
  city: string;
};

type StoredUser = {
  name: string;
  role: Role;
  city: string;
};

const USER_KEY = "eventura-user";

/**
 * Predefined users for now (you can change these)
 *
 * CEO LOGIN:
 *   Email: ceo@eventura.in
 *   Password: Eventura@123
 *
 * STAFF LOGIN:
 *   Email: staff@eventura.in
 *   Password: Eventura@123
 */
const USERS: UserRecord[] = [
  {
    email: "ceo@eventura.in",
    password: "Eventura@123",
    name: "Hardik Vekariya",
    role: "CEO",
    city: "Surat",
  },
  {
    email: "staff@eventura.in",
    password: "Eventura@123",
    name: "Event Manager",
    role: "Staff",
    city: "Surat",
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState("ceo@eventura.in");
  const [password, setPassword] = useState("Eventura@123");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = password.trim();

    const found = USERS.find(
      (u) =>
        u.email.toLowerCase() === trimmedEmail && u.password === trimmedPass
    );

    if (!found) {
      setError("Invalid login ID or password. Please try again.");
      return;
    }

    const storedUser: StoredUser = {
      name: found.name,
      role: found.role,
      city: found.city,
    };

    if (typeof window !== "undefined") {
      window.localStorage.setItem(USER_KEY, JSON.stringify(storedUser));
      // Go to dashboard
      window.location.href = "/";
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top, #1f2937 0, #020617 45%, #000 100%)",
        color: "#e5e7eb",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background:
            "radial-gradient(circle at top left, #1e293b 0, #020617 45%)",
          borderRadius: "1.5rem",
          padding: "1.75rem 1.75rem 1.5rem",
          border: "1px solid #111827",
          boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: "1.25rem", gap: "0.75rem" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "999px",
              background:
                "radial-gradient(circle at 30% 10%, #facc15 0, #a855f7 40%, #0ea5e9 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "1.1rem",
              color: "#020617",
            }}
          >
            E
          </div>
          <div>
            <div
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                letterSpacing: "-0.03em",
              }}
            >
              Eventura OS
            </div>
            <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
              Events that speak your style
            </div>
          </div>
        </div>

        <h1
          style={{
            fontSize: "1.3rem",
            fontWeight: 600,
            marginBottom: "0.25rem",
          }}
        >
          Sign in
        </h1>
        <p
          style={{
            fontSize: "0.8rem",
            color: "#9ca3af",
            marginBottom: "1rem",
          }}
        >
          Use your Eventura login ID and password. CEO sees all modules, staff
          sees limited access.
        </p>

        {error && (
          <div
            style={{
              marginBottom: "0.8rem",
              padding: "0.55rem 0.7rem",
              borderRadius: "0.75rem",
              fontSize: "0.78rem",
              background: "rgba(248, 113, 113, 0.1)",
              border: "1px solid rgba(248, 113, 113, 0.5)",
              color: "#fecaca",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.8rem" }}>
          <div>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: "0.78rem",
                marginBottom: "0.25rem",
                color: "#d1d5db",
              }}
            >
              Login ID (email)
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                borderRadius: "0.75rem",
                padding: "0.55rem 0.75rem",
                fontSize: "0.82rem",
                backgroundColor: "#020617",
                border: "1px solid #1f2937",
                color: "#e5e7eb",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: "0.78rem",
                marginBottom: "0.25rem",
                color: "#d1d5db",
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                borderRadius: "0.75rem",
                padding: "0.55rem 0.75rem",
                fontSize: "0.82rem",
                backgroundColor: "#020617",
                border: "1px solid #1f2937",
                color: "#e5e7eb",
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              marginTop: "0.6rem",
              width: "100%",
              borderRadius: "999px",
              padding: "0.6rem 0.75rem",
              fontSize: "0.85rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background:
                "linear-gradient(135deg, #facc15, #eab308, #a855f7)",
              color: "#111827",
              boxShadow: "0 16px 30px rgba(250, 204, 21, 0.3)",
            }}
          >
            Sign in
          </button>
        </form>

        <div
          style={{
            marginTop: "1.1rem",
            paddingTop: "0.7rem",
            borderTop: "1px solid #1f2937",
            fontSize: "0.75rem",
            color: "#9ca3af",
          }}
        >
          <div style={{ marginBottom: "0.25rem", fontWeight: 500 }}>
            Test logins:
          </div>
          <div>CEO → ceo@eventura.in / Eventura@123</div>
          <div>Staff → staff@eventura.in / Eventura@123</div>
        </div>
      </div>
    </main>
  );
}
