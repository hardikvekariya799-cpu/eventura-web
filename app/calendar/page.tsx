"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";

export default function CalendarPage() {
  const [user, setUser] = useState<User | null>(null);

  // AUTH
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

  if (!user) return null;

  const today = new Date();
  const todayStr = today.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <main className="eventura-os">
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="calendar" />
      </aside>

      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          <h1 className="eventura-title">Calendar – Eventura OS</h1>
          <p className="eventura-subtitle">
            View upcoming events, site visits and vendor meetings by date. This
            is a simple first version – we can later sync it with your Events
            data.
          </p>

          <section className="eventura-middle">
            {/* Left: Today */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Today</h2>
              <p className="eventura-small-text">
                Date: <b>{todayStr}</b>
              </p>
              <ul className="eventura-list" style={{ marginTop: "0.75rem" }}>
                <li className="eventura-list-item">
                  <div>
                    <div className="eventura-list-title">
                      No events added to Calendar yet
                    </div>
                    <div className="eventura-list-sub">
                      Use the Events module to manage event details.
                    </div>
                  </div>
                  <span className="eventura-tag eventura-tag-blue">
                    Coming soon
                  </span>
                </li>
              </ul>
            </div>

            {/* Right: Simple month grid */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Monthly calendar (basic)</h2>
              <p className="eventura-small-text">
                This is a placeholder grid so the Calendar page works. Later we
                can connect it to real events and allow clicking dates.
              </p>

              <div
                style={{
                  marginTop: "0.8rem",
                  display: "grid",
                  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                  gap: "0.35rem",
                  fontSize: "0.75rem",
                }}
              >
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (d) => (
                    <div
                      key={d}
                      style={{
                        textAlign: "center",
                        color: "#9ca3af",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {d}
                    </div>
                  )
                )}

                {Array.from({ length: 35 }).map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      height: "42px",
                      borderRadius: "0.65rem",
                      border: "1px solid rgba(31,41,55,0.9)",
                      background:
                        idx === 0
                          ? "radial-gradient(circle at top, #4c1d95, #020617)"
                          : "radial-gradient(circle at top, #020617, #020617)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: idx < 31 ? 1 : 0.35,
                    }}
                  >
                    {idx + 1 <= 31 ? idx + 1 : ""}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <footer className="eventura-footer">
            Eventura · Calendar module · © {new Date().getFullYear()}
          </footer>
        </div>
      </div>
    </main>
  );
}

/* Reuse sidebar/topbar helpers like other pages */

function SidebarCore({ user, active }: { user: User; active: string }) {
  const isCEO = user.role === "CEO";
  return (
    <>
      <div className="eventura-sidebar-header">
        <div className="eventura-logo-circle">E</div>
        <div className="eventura-logo-text">
          <div className="eventura-logo-name">Eventura OS</div>
          <div className="eventura-logo-tagline">
            Events that speak your style
          </div>
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
        <SidebarLink
          href="/inventory"
          label="Inventory & Assets"
          icon="📦"
          active={active === "inventory"}
        />
        {isCEO && (
          <SidebarLink
            href="/reports"
            label="Reports & Analytics"
            icon="📈"
            active={active === "reports"}
          />
        )}
        {isCEO && (
          <SidebarLink
            href="/settings"
            label="Settings & Access"
            icon="⚙️"
            active={active === "settings"}
          />
        )}
      </nav>
      <div className="eventura-sidebar-footer">
        <div className="eventura-sidebar-role">
          Role: {user.role === "CEO" ? "CEO / Super Admin" : "Staff"}
        </div>
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
          placeholder="Search events, clients, vendors..."
        />
      </div>
      <div className="eventura-topbar-right">
        <button className="eventura-topbar-icon" title="Notifications">
          🔔
        </button>
        <div className="eventura-user-avatar" title={user.name}>
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
