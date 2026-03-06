// ── Auth helpers ────────────────────────────────
function getToken() {
  return document.cookie.replace(/(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/, "$1") || null;
}

function setToken(token) {
  document.cookie = `token=${token}; path=/; max-age=${60 * 60}; SameSite=Lax`;
}

function clearToken() {
  document.cookie = "token=; path=/; max-age=0";
}

function getUser() {
  const raw = document.cookie.replace(/(?:(?:^|.*;\s*)user\s*=\s*([^;]*).*$)|^.*$/, "$1") || null;
  return raw ? JSON.parse(decodeURIComponent(raw)) : null;
}

function setUser(user) {
  document.cookie = `user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=${60 * 60}; SameSite=Lax`;
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = "/login";
    return false;
  }
  return true;
}

function logout() {
  clearToken();
  document.cookie = "user=; path=/; max-age=0";
  window.location.href = "/login";
}

// ── API helper ──────────────────────────────────
async function api(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ── Formatting ──────────────────────────────────
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── UI helpers ──────────────────────────────────
function showAlert(id, message, type = "error") {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `alert alert-${type} show`;
  el.textContent = message;
  if (type === "success") setTimeout(() => el.classList.remove("show"), 4000);
}

function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("show");
}

// ── Sidebar rendering ───────────────────────────
function renderSidebar(activePage) {
  const user = getUser();
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : "??";

  const nav = [
    { href: "/dashboard", icon: "home", label: "Dashboard" },
    { href: "/transfer", icon: "transfer", label: "Transfer" },
    { href: "/profile", icon: "profile", label: "Profile" },
  ];

  const icons = {
    home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>`,
    transfer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17,1 21,5 17,9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7,23 3,19 7,15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>`,
    profile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  };

  return `
    <a href="/dashboard" class="sidebar-logo">
      <div class="logo-icon">N</div>
      <span class="logo-text">GatlingBank</span>
    </a>
    <nav class="sidebar-nav">
      ${nav.map(n => `
        <a href="${n.href}" class="nav-link ${activePage === n.label.toLowerCase() ? 'active' : ''}">
          ${icons[n.icon]}
          ${n.label}
        </a>
      `).join("")}
    </nav>
    <div class="sidebar-footer">
      <div class="user-badge">
        <div class="user-avatar">${initials}</div>
        <div class="user-info">
          <div class="user-name">${user ? `${user.firstName} ${user.lastName}` : "Guest"}</div>
          <div class="user-email">${user ? user.email : ""}</div>
        </div>
      </div>
      <button onclick="logout()" class="btn btn-secondary btn-block" style="margin-top:12px; font-size:12px; padding:6px 12px;">Sign Out</button>
    </div>
  `;
}
