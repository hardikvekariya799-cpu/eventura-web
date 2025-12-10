"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

type Vendor = {
  id: number;
  name: string;
  category: string;
  city: string;
  contact: string;
  outstanding: string;
};

const USER_KEY = "eventura-user";
const VENDORS_KEY = "eventura-vendors";

export default function VendorsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [form, setForm] = useState<Omit<Vendor, "id">>({
    name: "",
    category: "",
    city: "",
    contact: "",
    outstanding: "",
  });

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

  // Load vendors
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(VENDORS_KEY);
    if (raw) {
      try {
        setVendors(JSON.parse(raw));
      } catch (e) {
        console.error("Failed to parse vendors", e);
      }
    }
  }, []);

  // Save vendors
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VENDORS_KEY, JSON.stringify(vendors));
  }, [vendors]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.category) {
      alert("Vendor name and category are required.");
      return;
    }
    const newVendor: Vendor = {
      id: Date.now(),
      ...form,
    };
    setVendors((prev) => [newVendor, ...prev]);
    setForm({
      name: "",
      category: "",
      city: "",
      contact: "",
      outstanding: "",
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this vendor?")) return;
    setVendors((prev) => prev.filter((v) => v.id !== id));
  }

  if (!user) return null;
  const isCEO = user.role === "CEO";

  return (
    <main className="eventura-os">
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="vendors" />
      </aside>

      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          <h1 className="eventura-title">Vendors</h1>
          <p className="eventura-subtitle">
            Manage Eventura vendor partners – decorators, caterers, photographers, DJs and more.
          </p>

          <section className="eventura-columns">
            {/* Form */}
            <div>
              <h2 className="eventura-panel-title">Add vendor</h2>
              <form className="eventura-form" onSubmit={handleSubmit}>
                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="name">
                      Vendor name
                    </label>
                    <input
                      id="name"
                      name="name"
                      className="eventura-input"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. Royal Decor Studio"
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="category">
                      Category
                    </label>
                    <input
                      id="category"
                      name="category"
                      className="eventura-input"
                      value={form.category}
                      onChange={handleChange}
                      placeholder="Decor / Catering / Photography / DJ..."
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
                    <label className="eventura-label" htmlFor="contact">
                      Contact (phone / person)
                    </label>
                    <input
                      id="contact"
                      name="contact"
                      className="eventura-input"
                      value={form.contact}
                      onChange={handleChange}
                      placeholder="e.g. +91-98765 43210, Mukesh"
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="outstanding">
                      Outstanding payable (₹)
                    </label>
                    <input
                      id="outstanding"
                      name="outstanding"
                      className="eventura-input"
                      value={form.outstanding}
                      onChange={handleChange}
                      placeholder="e.g. 1,25,000"
                    />
                  </div>
                </div>

                <div className="eventura-actions">
                  <button type="submit" className="eventura-button">
                    Save vendor
                  </button>
                </div>
              </form>
            </div>

            {/* List */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">All vendors</h2>
              {vendors.length === 0 ? (
                <p className="eventura-small-text">
                  No vendors added yet. Use the form to add your first partner.
                </p>
              ) : (
                <div className="eventura-table-wrapper">
                  <table className="eventura-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>City</th>
                        <th>Contact</th>
                        <th>Outstanding (₹)</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendors.map((v) => (
                        <tr key={v.id}>
                          <td>{v.name}</td>
                          <td>{v.category}</td>
                          <td>{v.city}</td>
                          <td>{v.contact}</td>
                          <td>{v.outstanding}</td>
                          <td>
                            <button
                              type="button"
                              className="eventura-button-secondary"
                              onClick={() => handleDelete(v.id)}
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
            Eventura · Vendors module · © {new Date().getFullYear()}
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
