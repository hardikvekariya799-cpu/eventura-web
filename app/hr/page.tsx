"use client";

import React, { useEffect, useState } from "react";

/* ================= TYPES ================= */

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
  salary: number;
};

/* ================= STORAGE KEY ================= */

const DB_KEY = "eventura-hr-clean";

/* ================= PAGE ================= */

export default function HRPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);

  /* ===== LOAD CLEAN ===== */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(DB_KEY);
    setTeam(raw ? JSON.parse(raw) : []);
  }, []);

  /* ===== SAVE ===== */
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(DB_KEY, JSON.stringify(team));
  }, [team]);

  /* ===== ACTIONS ===== */
  const remove = (id: number) => {
    if (!confirm("Delete member?")) return;
    setTeam((t) => t.filter((m) => m.id !== id));
  };

  const save = (m: TeamMember) => {
    setTeam((prev) => {
      const exists = prev.find((x) => x.id === m.id);
      if (exists) return prev.map((x) => (x.id === m.id ? m : x));
      return [...prev, m];
    });
    setOpen(false);
    setEditing(null);
  };

  const resetAll = () => {
    if (!confirm("CLEAR ALL HR DATA?")) return;
    localStorage.removeItem(DB_KEY);
    setTeam([]);
  };

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700 }}>HR & Team</h1>
      <p style={{ color: "#6b7280" }}>
        Direct access · No login · Clean data
      </p>

      {/* ACTIONS */}
      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <button onClick={() => setOpen(true)}>➕ Add Member</button>
        <button onClick={resetAll}>🧹 Reset HR</button>
      </div>

      {/* TABLE */}
      <table
        border={1}
        cellPadding={10}
        style={{ width: "100%", marginTop: 12 }}
      >
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>City</th>
            <th>Salary</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {team.map((m) => (
            <tr key={m.id}>
              <td>{m.name}</td>
              <td>{m.role}</td>
              <td>{m.status}</td>
              <td>{m.city}</td>
              <td>₹{m.salary.toLocaleString("en-IN")}</td>
              <td>
                <button onClick={() => { setEditing(m); setOpen(true); }}>
                  ✏ Edit
                </button>{" "}
                <button onClick={() => remove(m.id)}>🗑</button>
              </td>
            </tr>
          ))}
          {team.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", color: "#9ca3af" }}>
                No HR data yet
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* MODAL */}
      {open && (
        <MemberModal
          initial={editing}
          onClose={() => { setOpen(false); setEditing(null); }}
          onSave={save}
        />
      )}
    </main>
  );
}

/* ================= MODAL ================= */

function MemberModal({
  initial,
  onClose,
  onSave,
}: {
  initial: TeamMember | null;
  onClose: () => void;
  onSave: (m: TeamMember) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState<StaffRole>(
    initial?.role ?? "Event Manager"
  );
  const [status, setStatus] = useState<StaffStatus>(
    initial?.status ?? "Core"
  );
  const [city, setCity] = useState(initial?.city ?? "Surat");
  const [salary, setSalary] = useState(initial?.salary ?? 0);

  const submit = () => {
    if (!name.trim()) return alert("Name required");
    onSave({
      id: initial?.id ?? Date.now(),
      name,
      role,
      status,
      city,
      salary,
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ background: "#fff", padding: 20, width: 320 }}>
        <h3>{initial ? "Edit" : "Add"} Member</h3>

        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <select value={role} onChange={(e) => setRole(e.target.value as any)}>
          <option>Event Manager</option>
          <option>Decor Specialist</option>
          <option>Logistics</option>
          <option>Marketing</option>
          <option>Sales</option>
          <option>Accountant</option>
          <option>Operations</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
          <option>Core</option>
          <option>Freelancer</option>
          <option>Trainee</option>
          <option>Inactive</option>
        </select>
        <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <input type="number" placeholder="Salary" value={salary} onChange={(e) => setSalary(+e.target.value)} />

        <div style={{ marginTop: 12 }}>
          <button onClick={submit}>💾 Save</button>{" "}
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
