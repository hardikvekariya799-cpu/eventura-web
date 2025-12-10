"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

type TeamMember = {
  id: number;
  name: string;
  title: string;
  city: string;
  salary: string; // monthly salary ₹ as string
  employmentType: string; // Full-time / Part-time / Freelancer
  status: string; // Active / On Hold / Exited
  joiningDate: string; // YYYY-MM-DD
};

const USER_KEY = "eventura-user";
const HR_KEY = "eventura-hr-team";

export default function HRPage() {
  const [user, setUser] = useState<User | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [form, setForm] = useState<Omit<TeamMember, "id">>({
    name: "",
    title: "",
    city: "",
    salary: "",
    employmentType: "Full-time",
    status: "Active",
    joiningDate: "",
  });

  // --- AUTH ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) {
      window.location.href = "/login";
      return;
    }
    try {
      const u: User = JSON.parse(raw);
      setUser(u);
    } catch {
      window.localStorage.removeItem(USER_KEY);
      window.location.href = "/login";
    }
  }, []);

  // --- LOAD TEAM FROM STORAGE ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(HR_KEY);
    if (raw) {
      try {
        setTeam(JSON.parse(raw));
      } catch (e) {
        console.error("Failed to parse HR team", e);
      }
    }
  }, []);

  // --- SAVE TEAM TO STORAGE ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(HR_KEY, JSON.stringify(team));
  }, [team]);

  if (!user) return null;
  const isCEO = user.role === "CEO";

  // --- HELPERS ---
  function parseMoney(value: string): number {
    const cleaned = value.replace(/[₹, ,]/g, "");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }

  const totalMonthlySalary = team.reduce(
    (sum, member) => sum + parseMoney(member.salary || "0"),
    0
  );
  const totalAnnualSalary = totalMonthlySalary * 12;

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.title) {
      alert("Name and role are required.");
      return;
    }

    const newMember: TeamMember = {
      id: Date.now(),
      ...form,
    };

    setTeam((prev) => [newMember, ...prev]);

    setForm({
      name: "",
      title: "",
      city: "",
      salary: "",
      employmentType: "Full-time",
      status: "Active",
      joiningDate: "",
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this team member?")) return;
    setTeam((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <main className="eventura-os">
      {/* Sidebar */}
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="hr" />
      </aside>

      {/* Main area */}
      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          <h1 className="eventura-title">HR & Team</h1>
          <p className="eventura-subtitle">
            Keep track of your Eventura core team, roles, and salary structure.
            This salary summary can be used in the Finance tab for monthly P&L.
          </p>

          {/* SALARY SUMMARY SECTION */}
          <section className="eventura-kpi-row">
            <div className="eventura-card">
              <div className="eventura-card-label">Total team members</div>
              <div className="eventura-card-value">
                {team.length}
                <span className="eventura-card-icon">🧑‍💼</span>
              </div>
              <div className="eventura-card-note">Across all locations</div>
            </div>

            <div className="eventura-card">
              <div className="eventura-card-label">
                Total monthly salary (₹)
              </div>
              <div className="eventura-card-value">
                ₹{totalMonthlySalary.toLocaleString("en-IN")}
              </div>
              <div className="eventura-card-note">
                Use this as “Salaries” in Finance expenses
              </div>
            </div>

            <div className="eventura-card">
              <div className="eventura-card-label">
                Total annual salary (₹)
              </div>
              <div className="eventura-card-value">
                ₹{totalAnnualSalary.toLocaleString("en-IN")}
              </div>
              <div className="eventura-card-note">
                Approx. yearly HR cost at current structure
              </div>
            </div>

            {isCEO && (
              <div className="eventura-card">
                <div className="eventura-card-label">Send to Finance</div>
                <div className="eventura-card-value">
                  <Link
                    href={`/finance?from=hr&salaryTotal=${totalMonthlySalary}`}
                    className="eventura-button-secondary"
                  >
                    Open Finance tab
                  </Link>
                </div>
                <div className="eventura-card-note">
                  Manually include this salary total in your monthly Finance
                  records.
                </div>
              </div>
            )}
          </section>

          {/* FORM + TABLE */}
          <section className="eventura-columns">
            {/* Left: Add team member */}
            <div>
              <h2 className="eventura-panel-title">Add team member</h2>
              <form className="eventura-form" onSubmit={handleSubmit}>
                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="name">
                      Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      className="eventura-input"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. Event Manager – Rohan"
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="title">
                      Role / Title
                    </label>
                    <input
                      id="title"
                      name="title"
                      className="eventura-input"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="Event Manager / Decor Lead / Finance"
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="city">
                      City
                    </label>
                    <input
                      id="city"
                      name="city"
                      className="eventura-input"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="Surat / Ahmedabad / Rajkot"
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="salary">
                      Monthly salary (₹)
                    </label>
                    <input
                      id="salary"
                      name="salary"
                      className="eventura-input"
                      value={form.salary}
                      onChange={handleChange}
                      placeholder="e.g. 35,000"
                    />
                  </div>

                  <div className="eventura-field">
                    <label
                      className="eventura-label"
                      htmlFor="employmentType"
                    >
                      Employment type
                    </label>
                    <select
                      id="employmentType"
                      name="employmentType"
                      className="eventura-input"
                      value={form.employmentType}
                      onChange={handleChange}
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Freelancer">Freelancer</option>
                    </select>
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="status">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      className="eventura-input"
                      value={form.status}
                      onChange={handleChange}
                    >
                      <option value="Active">Active</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Exited">Exited</option>
                    </select>
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="joiningDate">
                      Joining date
                    </label>
                    <input
                      id="joiningDate"
                      name="joiningDate"
                      type="date"
                      className="eventura-input"
                      value={form.joiningDate}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="eventura-actions">
                  <button type="submit" className="eventura-button">
                    Save team member
                  </button>
                </div>
              </form>
            </div>

            {/* Right: team table */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Team list</h2>
              {team.length === 0 ? (
                <p className="eventura-small-text">
                  No team members yet. Add your core team on the left – this
                  also builds your salary view for Finance.
                </p>
              ) : (
                <div className="eventura-table-wrapper">
                  <table className="eventura-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>City</th>
                        <th>Monthly salary (₹)</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Joining</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.map((m) => (
                        <tr key={m.id}>
                          <td>{m.name}</td>
                          <td>{m.title}</td>
                          <td>{m.city}</td>
                          <td>{m.salary}</td>
                          <td>{m.employmentType}</td>
                          <td>{m.status}</td>
                          <td>{m.joiningDate}</td>
                          <td>
                            <button
                              type="button"
                              className="eventura-button-secondary"
                              onClick={() => handleDelete(m.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <footer className="eventura-footer">
            Eventura · HR & Team module · © {new Date().getFullYear()}
          </footer>
        </div>
      </div>
    </main>
  );
}

/* Shared layout pieces */

function SidebarCore({ user, active }: { user: User; active: string }) {
  const isCEO = user.role === "CEO";

  return (
    <>
      <div className="eventura-sidebar-header">
        <div className="eventura-logo-circle">E</div>
        <div className="eventura-logo-text">
          <div className="eventura-logo-name">Eventura OS</div>
        </div>
      </div>
      <nav className="eventura-sidebar-nav">
        <SidebarLink
          href="/"
          label="Dashboard"
          icon="📊"
          active={active === "dashboard"}
        />
        <SidebarLink
          href="/events"
          label="Events"
          icon="🎉"
          active={active === "events"}
        />
        <SidebarLink
          href="/calendar"
          label="Calendar"
          icon="📅"
          active={active === "calendar"}
        />
        <SidebarLink
          href="/leads"
          label="Clients & Leads"
          icon="👥"
          active={active === "leads"}
        />
        <SidebarLink
          href="/vendors"
          label="Vendors"
          icon="🤝"
          active={active === "vendors"}
        />
        {isCEO && (
          <SidebarLink
            href="/finance"
            label="Finance"
            icon="💰"
            active={active === "finance"}
          />
        )}
        <SidebarLink
          href="/hr"
          label="HR & Team"
          icon="🧑‍💼"
          active={active === "hr"}
        />
      </nav>
      <div className="eventura-sidebar-footer">
        <div className="eventura-sidebar-role">Role: {user.role}</div>
        <div className="eventura-sidebar-city">City: {user.city}</div>
      </div>
    </>
  );
}

function TopbarCore({ user }: { user: User }) {
  return (
    <header className="eventura-topbar">
      <div className="eventura-topbar-left">
        <div className="eventura-topbar-location">📍 {user.city}, Gujarat</div>
      </div>
      <div className="eventura-topbar-center">
        <input
          className="eventura-search"
          placeholder="Search (coming soon)"
          disabled
        />
      </div>
      <div className="eventura-topbar-right">
        <div className="eventura-user-avatar">
          {user.name.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}

function SidebarLink(props: {
  href: string;
  label: string;
  icon: string;
  active?: boolean;
}) {
  const className =
    "eventura-sidebar-link" +
    (props.active ? " eventura-sidebar-link-active" : "");
  return (
    <Link href={props.href} className={className}>
      <span className="eventura-sidebar-icon">{props.icon}</span>
      <span>{props.label}</span>
    </Link>
  );
}
