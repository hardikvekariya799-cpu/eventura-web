"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/* ================= AUTH ================= */

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";

/* ================= DB KEYS ================= */

const DB_TEAM = "eventura-hr-team";
const DB_AUDIT = "eventura-hr-audit";

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
  workload: number;
  monthlySalary: number;
  eventsThisMonth: number;
  rating: number;
  skills: string[];
  createdAt: string;
  updatedAt: string;
};

type AuditItem = {
  id: number;
  time: string;
  actor: string;
  action: string;
  detail: string;
};

/* ================= HELPERS ================= */

const now = () => new Date().toISOString();

const emptyMember = (): TeamMember => ({
  id: Date.now(),
  name: "",
  role: "Event Manager",
  city: "Surat",
  status: "Core",
  workload: 60,
  monthlySalary: 0,
  eventsThisMonth: 0,
  rating: 4,
  skills: [],
  createdAt: now(),
  updatedAt: now(),
});

/* ================= PAGE ================= */

export default function HRPage() {
  const [user, setUser] = useState<User | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [view, setView] = useState<"overview" | "directory" | "audit">(
    "overview"
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);

  /* ---------- AUTH & LOAD ---------- */
  useEffect(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return (window.location.href = "/login");
    setUser(JSON.parse(raw));

    setTeam(JSON.parse(localStorage.getItem(DB_TEAM) || "[]"));
    setAudit(JSON.parse(localStorage.getItem(DB_AUDIT) || "[]"));
  }, []);

  /* ---------- SAVE ---------- */
  useEffect(() => {
    if (!user) return;
    localStorage.setItem(DB_TEAM, JSON.stringify(team));
    localStorage.setItem(DB_AUDIT, JSON.stringify(audit));
  }, [team, audit, user]);

  if (!user) return null;
  const isCEO = user.role === "CEO";

  /* ---------- ACTIONS ---------- */

  const log = (action: string, detail: string) => {
    setAudit((a) => [
      {
        id: Date.now(),
        time: new Date().toLocaleString(),
        actor: user.name,
        action,
        detail,
      },
      ...a,
    ]);
  };

  const saveMember = (m: TeamMember) => {
    if (!isCEO) return;
    setTeam((prev) => {
      const exists = prev.find((x) => x.id === m.id);
      if (exists) {
        log("EDIT", m.name);
        return prev.map((x) => (x.id === m.id ? m : x));
      }
      log("ADD", m.name);
      return [m, ...prev];
    });
    setModalOpen(false);
    setEditing(null);
  };

  const removeMember = (id: number) => {
    if (!isCEO) return;
    const m = team.find((x) => x.id === id);
    if (!m) return;
    if (!confirm(`Delete ${m.name}?`)) return;
    setTeam(team.filter((x) => x.id !== id));
    log("DELETE", m.name);
  };

  const clearHR = () => {
    if (!isCEO) return;
    if (!confirm("Clear ALL HR data?")) return;
    setTeam([]);
    setAudit([]);
  };

  /* ================= UI ================= */

  return (
    <main className="eventura-os">
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="hr" />
      </aside>

      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          <h1 className="eventura-page-title">HR & Team</h1>

          <div className="eventura-chips-row">
            {["overview", "directory", "audit"].map((v) => (
              <button
                key={v}
                className={`eventura-tag ${
                  view === v ? "eventura-tag-blue" : "eventura-tag-amber"
                }`}
                onClick={() => setView(v as any)}
              >
                {v.toUpperCase()}
              </button>
            ))}
          </div>

          {isCEO && (
            <div style={{ margin: "10px 0" }}>
              <button
                className="eventura-button"
                onClick={() => {
                  setEditing(emptyMember());
                  setModalOpen(true);
                }}
              >
                ➕ Add Member
              </button>
              <button
                className="eventura-button-secondary"
                onClick={clearHR}
                style={{ marginLeft: 10 }}
              >
                🧹 Clear HR
              </button>
            </div>
          )}

          {view === "overview" && (
            <div className="eventura-card">
              <p>Total Members: {team.length}</p>
              <p>
                Core: {team.filter((m) => m.status === "Core").length} ·
                Freelancers:{" "}
                {team.filter((m) => m.status === "Freelancer").length}
              </p>
            </div>
          )}

          {view === "directory" && (
            <table className="eventura-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>City</th>
                  <th>Workload</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {team.length === 0 && (
                  <tr>
                    <td colSpan={6}>No HR data added yet.</td>
                  </tr>
                )}
                {team.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td>{m.role}</td>
                    <td>{m.status}</td>
                    <td>{m.city}</td>
                    <td>{m.workload}%</td>
                    <td>
                      {isCEO && (
                        <>
                          <button
                            onClick={() => {
                              setEditing(m);
                              setModalOpen(true);
                            }}
                          >
                            ✏
                          </button>
                          <button onClick={() => removeMember(m.id)}>
                            🗑
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {view === "audit" && (
            <table className="eventura-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td>{a.time}</td>
                    <td>{a.actor}</td>
                    <td>{a.action}</td>
                    <td>{a.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen && (
        <MemberModal
          member={editing!}
          onClose={() => setModalOpen(false)}
          onSave={saveMember}
        />
      )}
    </main>
  );
}

/* ================= MODAL ================= */

function MemberModal({
  member,
  onClose,
  onSave,
}: {
  member: TeamMember;
  onClose: () => void;
  onSave: (m: TeamMember) => void;
}) {
  const [m, setM] = useState(member);

  return (
    <div className="eventura-modal-overlay">
      <div className="eventura-modal">
        <h2>Add / Edit Member</h2>

        {["name", "city"].map((k) => (
          <input
            key={k}
            className="eventura-search"
            placeholder={k}
            value={(m as any)[k]}
            onChange={(e) => setM({ ...m, [k]: e.target.value })}
          />
        ))}

        <input
          type="number"
          className="eventura-search"
          placeholder="Workload %"
          value={m.workload}
          onChange={(e) => setM({ ...m, workload: +e.target.value })}
        />

        <button className="eventura-button" onClick={() => onSave(m)}>
          Save
        </button>
        <button
          className="eventura-button-secondary"
          onClick={onClose}
          style={{ marginLeft: 10 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ================= SHARED UI ================= */

function SidebarCore({ user, active }: any) {
  return (
    <nav>
      <Link href="/hr">HR</Link>
    </nav>
  );
}

function TopbarCore({ user }: any) {
  return <div className="eventura-topbar">Welcome {user.name}</div>;
}
