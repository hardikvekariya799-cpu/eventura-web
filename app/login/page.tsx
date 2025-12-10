"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "CEO" | "Staff";
type User = { name: string; role: Role };

const USER_KEY = "eventura-user";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("CEO");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please enter your name");
      return;
    }

    const user: User = { name: name.trim(), role };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    router.push("/");
  }

  return (
    <main className="eventura-page">
      <div className="eventura-shell">
        <header className="eventura-header">
          <div>
            <h1 className="eventura-title">Eventura – Login</h1>
            <p className="eventura-subtitle">
              Choose your role to access the Eventura console.
            </p>
          </div>
        </header>

        <section className="eventura-form">
          <form onSubmit={handleSubmit} className="eventura-form-grid">
            <div className="eventura-field">
              <label className="eventura-label" htmlFor="name">
                Your name
              </label>
              <input
                id="name"
                className="eventura-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hardik Vekariya"
              />
            </div>

            <div className="eventura-field">
              <label className="eventura-label" htmlFor="role">
                Role
              </label>
              <select
                id="role"
                className="eventura-select"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                <option value="CEO">CEO (full access)</option>
                <option value="Staff">Staff (Events + Leads)</option>
              </select>
            </div>

            <div className="eventura-actions">
              <button type="submit" className="eventura-button">
                Enter Eventura
              </button>
            </div>
          </form>
        </section>

        <footer className="eventura-footer">
          Eventura · Secure access console · © {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  );
}
