"use client";

import { useState } from "react";

const USERS = [
  {
    email: "ceo@eventura.com",
    password: "Eventura@2025",
    role: "CEO",
    name: "Hardik Vekariya",
    city: "Surat",
  },
  {
    email: "staff@eventura.com",
    password: "Eventura123",
    role: "Staff",
    name: "Eventura Staff",
    city: "Surat",
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = () => {
    const user = USERS.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      setError("Invalid email or password");
      return;
    }

    sessionStorage.setItem(
      "eventura-user",
      JSON.stringify({
        name: user.name,
        role: user.role,
        city: user.city,
      })
    );

    window.location.href = "/";
  };

  return (
    <main className="eventura-login">
      <div className="eventura-login-card">
        <h1>Eventura OS</h1>
        <p>Secure Login</p>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <div className="error">{error}</div>}

        <button onClick={login}>Login</button>

        <div className="hint">
          CEO → ceo@eventura.com <br />
          Staff → staff@eventura.com
        </div>
      </div>
    </main>
  );
}
