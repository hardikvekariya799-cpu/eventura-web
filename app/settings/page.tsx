"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

const USER_KEY = "eventura-user";
const SETTINGS_KEY = "eventura-settings";

type CompanySettings = {
  companyName: string;
  tagline: string;
  cities: string;
  gstNumber: string;
  bankName: string;
  bankAccount: string;
  logoUrl: string;
};

type AccessSettings = {
  staff: {
    events: boolean;
    calendar: boolean;
    leads: boolean;
    vendors: boolean;
    finance: boolean;
    hr: boolean;
    inventory: boolean;
    reports: boolean;
  };
};

type FullSettings = {
  company: CompanySettings;
  access: AccessSettings;
};

const defaultSettings: FullSettings = {
  company: {
    companyName: "Eventura – Royal Event & Wedding Design Studio",
    tagline: "Events that speak your style",
    cities: "Surat, Ahmedabad, Rajkot",
    gstNumber: "",
    bankName: "",
    bankAccount: "",
    logoUrl: "",
  },
  access: {
    staff: {
      events: true,
      calendar: true,
      leads: true,
      vendors: true,
      finance: false,
      hr: false,
      inventory: true,
      reports: false,
    },
  },
};

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<FullSettings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);

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

  // LOAD SETTINGS
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      try {
        const parsed: FullSettings = JSON.parse(raw);
        setSettings({
          company: { ...defaultSettings.company, ...parsed.company },
          access: { ...defaultSettings.access, ...parsed.access },
        });
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    setLoaded(true);
  }, []);

  // SAVE SETTINGS
  useEffect(() => {
    if (!loaded) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings, loaded]);

  if (!user) return null;
  const isCEO = user.role === "CEO";

  function handleCompanyChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      company: { ...prev.company, [name]: value },
    }));
  }

  function handleAccessToggle(module: keyof AccessSettings["staff"]) {
    setSettings((prev) => ({
      ...prev,
      access: {
        ...prev.access,
        staff: {
          ...prev.access.staff,
          [module]: !prev.access.staff[module],
        },
      },
    }));
  }

  return (
    <main className="eventura-os">
      {/* Sidebar */}
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="settings" />
      </aside>

      {/* Main area */}
      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          <h1 className="eventura-title">Settings & Access Control</h1>
          <p className="eventura-subtitle">
            Configure Eventura company details and choose which modules Staff
            can use. Settings are stored in this browser (local storage) and can
            be used for future backend integration.
          </p>

          {/* COMPANY SETTINGS */}
          <section className="eventura-columns" style={{ marginBottom: "1.5rem" }}>
            <div>
              <h2 className="eventura-panel-title">Company profile</h2>
              <form className="eventura-form">
                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="companyName">
                      Company name
                    </label>
                    <input
                      id="companyName"
                      name="companyName"
                      className="eventura-input"
                      value={settings.company.companyName}
                      onChange={handleCompanyChange}
                      placeholder="Eventura – Royal Event & Wedding Design Studio"
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="tagline">
                      Tagline
                    </label>
                    <input
                      id="tagline"
                      name="tagline"
                      className="eventura-input"
                      value={settings.company.tagline}
                      onChange={handleCompanyChange}
                      placeholder="Events that speak your style"
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="cities">
                      Operating cities
                    </label>
                    <input
                      id="cities"
                      name="cities"
                      className="eventura-input"
                      value={settings.company.cities}
                      onChange={handleCompanyChange}
                      placeholder="Surat, Ahmedabad, Rajkot"
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="gstNumber">
                      GST number
                    </label>
                    <input
                      id="gstNumber"
                      name="gstNumber"
                      className="eventura-input"
                      value={settings.company.gstNumber}
                      onChange={handleCompanyChange}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="bankName">
                      Bank name
                    </label>
                    <input
                      id="bankName"
                      name="bankName"
                      className="eventura-input"
                      value={settings.company.bankName}
                      onChange={handleCompanyChange}
                      placeholder="e.g. HDFC Bank"
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="bankAccount">
                      Bank account details
                    </label>
                    <input
                      id="bankAccount"
                      name="bankAccount"
                      className="eventura-input"
                      value={settings.company.bankAccount}
                      onChange={handleCompanyChange}
                      placeholder="Account number / IFSC (optional)"
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="logoUrl">
                      Logo URL (optional)
                    </label>
                    <input
                      id="logoUrl"
                      name="logoUrl"
                      className="eventura-input"
                      value={settings.company.logoUrl}
                      onChange={handleCompanyChange}
                      placeholder="https://.../eventura-logo.png"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Preview panel */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">Brand preview</h2>
              <div className="eventura-brand-preview">
                {settings.company.logoUrl ? (
                  <img
                    src={settings.company.logoUrl}
                    alt="Eventura logo"
                    style={{
                      maxWidth: "160px",
                      maxHeight: "80px",
                      objectFit: "contain",
                      marginBottom: "0.75rem",
                    }}
                  />
                ) : (
                  <div className="eventura-logo-circle">E</div>
                )}
                <div>
                  <div className="eventura-logo-name">
                    {settings.company.companyName || "Eventura"}
                  </div>
                  <div className="eventura-logo-tagline">
                    {settings.company.tagline || "Events that speak your style"}
                  </div>
                  <div className="eventura-small-text" style={{ marginTop: "0.4rem" }}>
                    Cities: {settings.company.cities || "—"}
                  </div>
                  <div className="eventura-small-text">
                    GST: {settings.company.gstNumber || "—"}
                  </div>
                  <div className="eventura-small-text">
                    Bank:{" "}
                    {settings.company.bankName
                      ? `${settings.company.bankName} – ${settings.company.bankAccount}`
                      : "—"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ACCESS CONTROL */}
          <section className="eventura-panel">
            <h2 className="eventura-panel-title">Access control – Staff modules</h2>
            {!isCEO && (
              <p className="eventura-small-text">
                You are logged in as Staff. Only CEO can change access settings.
              </p>
            )}

            <div className="eventura-table-wrapper">
              <table className="eventura-table">
                <thead>
                  <tr>
                    <th>Module</th>
                    <th>Staff can access?</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: "events", label: "Events" },
                    { key: "calendar", label: "Calendar" },
                    { key: "leads", label: "Clients & Leads" },
                    { key: "vendors", label: "Vendors" },
                    { key: "finance", label: "Finance" },
                    { key: "hr", label: "HR & Team" },
                    { key: "inventory", label: "Inventory & Assets" },
                    { key: "reports", label: "Reports & Analytics" },
                  ].map((row) => {
                    const k = row.key as keyof AccessSettings["staff"];
                    const allowed = settings.access.staff[k];
                    return (
                      <tr key={row.key}>
                        <td>{row.label}</td>
                        <td>
                          <label
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              cursor: isCEO ? "pointer" : "default",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={allowed}
                              onChange={() =>
                                isCEO && handleAccessToggle(k)
                              }
                              disabled={!isCEO}
                            />
                            <span>{allowed ? "Allowed" : "Hidden for Staff"}</span>
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="eventura-small-text" style={{ marginTop: "0.75rem" }}>
              These settings are stored locally. Right now they are for planning
              your access policy – the app still uses simple rule: CEO sees
              everything, Staff has limited links. In future, this can be wired
              to actually hide modules based on your choices here.
            </p>
          </section>

          <footer className="eventura-footer">
            Eventura · Settings & Access · © {new Date().getFullYear()}
          </footer>
        </div>
      </div>
    </main>
  );
}

/* Shared layout helpers */

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
