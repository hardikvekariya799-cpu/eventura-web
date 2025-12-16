"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* ===================== TYPES ===================== */

type StaffRole =
  | "Event Manager"
  | "Decor Specialist"
  | "Logistics"
  | "Marketing"
  | "Sales"
  | "Accountant"
  | "Operations";

type StaffStatus = "Core" | "Freelancer" | "Trainee" | "Inactive";

type TeamMember = {
  id: number;
  name: string;
  role: StaffRole;
  city: string;
  status: StaffStatus;
  workload: number;
  salary: number;
  rating: number;
  skills: string;
};

/* ===================== STORAGE ===================== */

const DB_KEY = "eventura_hr_v1"; // NEW KEY → no old data conflict

/* ===================== HELPERS ===================== */

const emptyMember = (): TeamMember => ({
  id: Date.now(),
  name: "",
  role: "Event Manager",
  city: "Surat",
  status: "Core",
  workload: 60,
  salary: 0,
  rating: 4,
  skills: "",
});

/* ===================== PAGE ===================== */

export default function HRPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [editing, setEditing] = useState<TeamMember | null>(null);

  /* Load */
  useEffect(() => {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) setTeam(JSON.parse(raw));
  }, []);

  /* Save */
  useEffect(() => {
    localStorage.setItem(DB_KEY, JSON.stringify(team));
  }, [team]);

  /* Stats */
  const stats = useMemo(() => {
    const core = team.filter((m) => m.status === "Core");
    return {
      total: team.length,
      core: core.length,
      salary: core.reduce((s, m) => s + m.salary, 0),
      avgWorkload:
        core.reduce((s, m) => s + m.workload, 0) / (core.length || 1),
    };
  }, [team]);

  /* Actions */
  const saveMember = () => {
    if (!editing || !editing.name.trim()) return alert("Name required");

    setTeam((prev) => {
      const exists = prev.find((m) => m.id === editing.id);
      if (exists) {
        return prev.map((m) => (m.id === editing.id ? editing : m));
      }
      return [editing, ...prev];
    });
    setEditing(null);
  };

  const removeMember = (id: number) => {
    if (!confirm("Delete member?")) return;
    setTeam((prev) => prev.filter((m) => m.id !== id));
  };

  const clearAll = () => {
    if (!confirm("Clear ALL HR data?")) return;
    localStorage.removeItem(DB_KEY);
    setTeam([]);
  };

  /* ===================== UI ===================== */

  return (
    <main className="eventura-os">
      <aside className="eventura-sidebar">
        <nav>
          <Link href="/">📊 Dashboard</Link>
          <Link href="/events">🎉 Events</Link>
          <Link href="/hr" className="active">🧑‍💼 HR</Link>
          <Link href="/finance">💰 Finance</Link>
        </nav>
      </aside>

      <section className="eventura-main">
        <header className="eventura-topbar">
          <h1>HR Management</h1>
          <span className="tag">Direct Access (No Login)</span>
        </header>

        {/* STATS */}
        <div className="grid">
          <Card title="Total Team" value={stats.total} />
          <Card title="Core Staff" value={stats.core} />
          <Card title="Salary Run Rate" value={`₹${stats.salary}`} />
          <Card title="Avg Workload" value={`${Math.round(stats.avgWorkload)}%`} />
        </div>

        {/* ACTIONS */}
        <div className="actions">
          <button onClick={() => setEditing(emptyMember())}>➕ Add Member</button>
          <button onClick={clearAll}>🧹 Clear All</button>
        </div>

        {/* TABLE */}
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Workload</th>
              <th>Salary</th>
              <th>Rating</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {team.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.role}</td>
                <td>{m.status}</td>
                <td>{m.workload}%</td>
                <td>{m.salary ? `₹${m.salary}` : "—"}</td>
                <td>{m.rating}/5</td>
                <td>
                  <button onClick={() => setEditing(m)}>✏</button>
                  <button onClick={() => removeMember(m.id)}>🗑</button>
                </td>
              </tr>
            ))}
            {!team.length && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", opacity: 0.6 }}>
                  No HR data yet. Click “Add Member”.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* MODAL */}
        {editing && (
          <div className="modal">
            <div className="modal-box">
              <h2>{editing.name ? "Edit" : "Add"} Member</h2>

              <input
                placeholder="Name"
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />

              <select
                value={editing.role}
                onChange={(e) =>
                  setEditing({ ...editing, role: e.target.value as StaffRole })
                }
              >
                {[
                  "Event Manager",
                  "Decor Specialist",
                  "Logistics",
                  "Marketing",
                  "Sales",
                  "Accountant",
                  "Operations",
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>

              <select
                value={editing.status}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    status: e.target.value as StaffStatus,
                  })
                }
              >
                {["Core", "Freelancer", "Trainee", "Inactive"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Workload %"
                value={editing.workload}
                onChange={(e) =>
                  setEditing({ ...editing, workload: +e.target.value })
                }
              />

              <input
                type="number"
                placeholder="Salary"
                value={editing.salary}
                onChange={(e) =>
                  setEditing({ ...editing, salary: +e.target.value })
                }
              />

              <input
                type="number"
                placeholder="Rating (1–5)"
                value={editing.rating}
                onChange={(e) =>
                  setEditing({ ...editing, rating: +e.target.value })
                }
              />

              <textarea
                placeholder="Skills"
                value={editing.skills}
                onChange={(e) =>
                  setEditing({ ...editing, skills: e.target.value })
                }
              />

              <div className="modal-actions">
                <button onClick={saveMember}>Save</button>
                <button onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

/* ===================== UI PARTS ===================== */

function Card({ title, value }: { title: string; value: any }) {
  return (
    <div className="card">
      <p>{title}</p>
      <h3>{value}</h3>
    </div>
  );
}
