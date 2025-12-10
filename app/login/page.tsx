"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("CEO");
  const [city, setCity] = useState("Surat");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please enter your name");
      return;
    }

    const user: User = { name: name.trim(), role, city };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    router.push("/");
  }

  return (
    <main className="eventura-page">
      <div className="eventura-login-shell">
        <h1 className="eventura-title">Eventura OS – Login</h1>
        <p className="eventura-subtitle">
          Choose your role to access the Eventura operating system.
        </p>

        <form onSubmit={handleSubmit} className="eventura-form">
          <div className="eventura-form-grid">
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
                <option value="Staff">Staff (Events + Leads only)</option>
              </select>
            </div>

            <div className="eventura-field">
              <label className="eventura-label" htmlFor="city">
                City
              </label>
              <select
                id="city"
                className="eventura-select"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option>Surat</option>
                <option>Ahmedabad</option>
                <option>Rajkot</option>
              </select>
            </div>
          </div>

          <div className="eventura-actions">
            <button type="submit" className="eventura-button">
              Enter Eventura OS
            </button>
          </div>
        </form>

        <footer className="eventura-footer">
          Eventura · Secure access console · © {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  );
}
