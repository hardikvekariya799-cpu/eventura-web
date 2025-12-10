"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Role = "CEO" | "Staff";
type User = { name: string; role: Role; city: string };

type AssetItem = {
  id: number;
  name: string;
  category: string; // Decor / Lighting / Furniture / Sound / Other
  location: string; // Office / Warehouse / Vendor / Farmhouse
  purchaseCost: string; // ₹ string
  purchaseDate: string; // YYYY-MM-DD
  vendor: string;
  condition: string; // Good / Repair / Replace
  usageCount: string; // number as string
};

const USER_KEY = "eventura-user";
const INVENTORY_KEY = "eventura-inventory";

export default function InventoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [form, setForm] = useState<Omit<AssetItem, "id">>({
    name: "",
    category: "",
    location: "",
    purchaseCost: "",
    purchaseDate: "",
    vendor: "",
    condition: "Good",
    usageCount: "",
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

  // --- LOAD ASSETS ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(INVENTORY_KEY);
    if (raw) {
      try {
        setAssets(JSON.parse(raw));
      } catch (e) {
        console.error("Failed to parse inventory", e);
      }
    }
  }, []);

  // --- SAVE ASSETS ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(INVENTORY_KEY, JSON.stringify(assets));
  }, [assets]);

  if (!user) return null;
  const isCEO = user.role === "CEO";

  function parseMoney(value: string): number {
    const cleaned = value.replace(/[₹, ,]/g, "");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }

  const totalAssetValue = assets.reduce(
    (sum, a) => sum + parseMoney(a.purchaseCost || "0"),
    0
  );

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.category) {
      alert("Asset name and category are required.");
      return;
    }

    const newAsset: AssetItem = {
      id: Date.now(),
      ...form,
    };

    setAssets((prev) => [newAsset, ...prev]);

    setForm({
      name: "",
      category: "",
      location: "",
      purchaseCost: "",
      purchaseDate: "",
      vendor: "",
      condition: "Good",
      usageCount: "",
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this asset?")) return;
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <main className="eventura-os">
      {/* Sidebar */}
      <aside className="eventura-sidebar">
        <SidebarCore user={user} active="inventory" />
      </aside>

      {/* Main area */}
      <div className="eventura-main">
        <TopbarCore user={user} />

        <div className="eventura-content">
          <h1 className="eventura-title">Inventory & Assets</h1>
          <p className="eventura-subtitle">
            Track your decor, lighting, furniture and other assets used in
            Eventura events. This helps you understand investment already done.
          </p>

          {/* SUMMARY CARDS */}
          <section className="eventura-kpi-row">
            <div className="eventura-card">
              <div className="eventura-card-label">Total items</div>
              <div className="eventura-card-value">
                {assets.length}
                <span className="eventura-card-icon">📦</span>
              </div>
              <div className="eventura-card-note">
                Includes all decor, lights, furniture, etc.
              </div>
            </div>

            <div className="eventura-card">
              <div className="eventura-card-label">
                Total purchase value (₹)
              </div>
              <div className="eventura-card-value">
                ₹{totalAssetValue.toLocaleString("en-IN")}
              </div>
              <div className="eventura-card-note">
                Use as “Assets / Capex” reference in Finance.
              </div>
            </div>

            {isCEO && (
              <div className="eventura-card">
                <div className="eventura-card-label">Send to Finance</div>
                <div className="eventura-card-value">
                  <Link
                    href={`/finance?from=inventory&assetValue=${totalAssetValue}`}
                    className="eventura-button-secondary"
                  >
                    Open Finance tab
                  </Link>
                </div>
                <div className="eventura-card-note">
                  Manually include this asset value in long-term planning.
                </div>
              </div>
            )}
          </section>

          {/* FORM + TABLE */}
          <section className="eventura-columns">
            {/* LEFT: ADD ASSET */}
            <div>
              <h2 className="eventura-panel-title">Add asset</h2>
              <form className="eventura-form" onSubmit={handleSubmit}>
                <div className="eventura-form-grid">
                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="name">
                      Item name
                    </label>
                    <input
                      id="name"
                      name="name"
                      className="eventura-input"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. Golden wedding mandap"
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
                      placeholder="Decor / Lighting / Furniture / Sound..."
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="location">
                      Location
                    </label>
                    <input
                      id="location"
                      name="location"
                      className="eventura-input"
                      value={form.location}
                      onChange={handleChange}
                      placeholder="Office / Warehouse / Vendor store"
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="purchaseCost">
                      Purchase cost (₹)
                    </label>
                    <input
                      id="purchaseCost"
                      name="purchaseCost"
                      className="eventura-input"
                      value={form.purchaseCost}
                      onChange={handleChange}
                      placeholder="e.g. 2,50,000"
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="purchaseDate">
                      Purchase date
                    </label>
                    <input
                      id="purchaseDate"
                      name="purchaseDate"
                      type="date"
                      className="eventura-input"
                      value={form.purchaseDate}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="vendor">
                      Vendor / Supplier
                    </label>
                    <input
                      id="vendor"
                      name="vendor"
                      className="eventura-input"
                      value={form.vendor}
                      onChange={handleChange}
                      placeholder="e.g. Royal Decor Supplier"
                    />
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="condition">
                      Condition
                    </label>
                    <select
                      id="condition"
                      name="condition"
                      className="eventura-input"
                      value={form.condition}
                      onChange={handleChange}
                    >
                      <option value="Good">Good</option>
                      <option value="Repair">Repair</option>
                      <option value="Replace">Replace</option>
                    </select>
                  </div>

                  <div className="eventura-field">
                    <label className="eventura-label" htmlFor="usageCount">
                      Usage count (# events used)
                    </label>
                    <input
                      id="usageCount"
                      name="usageCount"
                      className="eventura-input"
                      value={form.usageCount}
                      onChange={handleChange}
                      placeholder="e.g. 12"
                    />
                  </div>
                </div>

                <div className="eventura-actions">
                  <button type="submit" className="eventura-button">
                    Save asset
                  </button>
                </div>
              </form>
            </div>

            {/* RIGHT: TABLE */}
            <div className="eventura-panel">
              <h2 className="eventura-panel-title">All assets</h2>
              {assets.length === 0 ? (
                <p className="eventura-small-text">
                  No assets yet. Add your key decor, lighting, furniture and
                  other inventory items using the form.
                </p>
              ) : (
                <div className="eventura-table-wrapper">
                  <table className="eventura-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Category</th>
                        <th>Location</th>
                        <th>Purchase (₹)</th>
                        <th>Date</th>
                        <th>Vendor</th>
                        <th>Condition</th>
                        <th>Used (#)</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map((a) => (
                        <tr key={a.id}>
                          <td>{a.name}</td>
                          <td>{a.category}</td>
                          <td>{a.location}</td>
                          <td>{a.purchaseCost}</td>
                          <td>{a.purchaseDate}</td>
                          <td>{a.vendor}</td>
                          <td>{a.condition}</td>
                          <td>{a.usageCount}</td>
                          <td>
                            <button
                              type="button"
                              className="eventura-button-secondary"
                              onClick={() => handleDelete(a.id)}
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
            Eventura · Inventory & Assets module · © {new Date().getFullYear()}
          </footer>
        </div>
      </div>
    </main>
  );
}

/* Shared layout helpers – similar to other pages */

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
