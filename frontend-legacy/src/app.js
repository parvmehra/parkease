const API_BASE = localStorage.getItem("parkease_api_base") || "http://localhost:4444";
const WS_BASE = localStorage.getItem("parkease_ws_base") || "ws://localhost:4445";
const AUTH_KEY = "parkease_auth";

const state = {
  auth: readAuth(),
  lots: [],
  selectedLot: null,
  lotDisplay: null,
  bookings: [],
  vendorBookings: [],
  selectedSlots: new Set(),
  ws: null,
  wsStatus: "offline",
  events: [],
  canvasOptions: null,
  bookingFilter: "all",
};

const app = document.querySelector("#app");

function readAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY));
  } catch {
    return null;
  }
}

function saveAuth(auth) {
  state.auth = auth;
  if (auth) localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  else localStorage.removeItem(AUTH_KEY);
}

function toast(message, type = "success") {
  const root = document.querySelector("#toast-root");
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.textContent = message;
  root.appendChild(item);
  setTimeout(() => item.remove(), 4200);
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (state.auth?.token) headers.Authorization = `Bearer ${state.auth.token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

function navigate(path) {
  location.hash = path;
}

function route() {
  const path = location.hash.replace(/^#/, "") || "/";
  if (path.startsWith("/customer") && !guard("Customer")) return;
  if (path.startsWith("/vendor") && !guard("Vendor")) return;
  if (path === "/login") return renderLogin();
  if (path === "/signup") return renderSignup();
  if (path.startsWith("/customer")) return renderCustomer();
  if (path.startsWith("/vendor")) return renderVendor();
  renderLanding();
}

function guard(type) {
  if (!state.auth?.token) {
    navigate("/login");
    return false;
  }
  if (state.auth.user.type !== type) {
    navigate(state.auth.user.type === "Vendor" ? "/vendor" : "/customer");
    return false;
  }
  return true;
}

function shell(content) {
  const user = state.auth?.user;
  app.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" href="#/"><span class="brand-mark">P</span><span>ParkEase</span></a>
        <nav class="nav">
          <a href="#/">Home</a>
          ${user ? `<a href="#/${user.type === "Vendor" ? "vendor" : "customer"}">Dashboard</a>` : ""}
          ${user ? `<button class="link-button" data-action="logout">Logout</button>` : `<a href="#/login">Login</a><a class="button" href="#/signup">Signup</a>`}
        </nav>
      </header>
      ${content}
    </div>
  `;
  app.querySelector('[data-action="logout"]')?.addEventListener("click", () => {
    disconnectWs();
    saveAuth(null);
    toast("Logged out");
    navigate("/");
  });
}

function renderLanding() {
  shell(`
    <main>
      <section class="hero">
        <div class="hero-inner">
          <div class="eyebrow">Real-time parking operations</div>
          <h1>ParkEase</h1>
          <p>Find available parking, reserve slots, and keep lot operations moving with live booking and occupancy updates for customers and vendors.</p>
          <div class="hero-actions">
            <a class="button" href="#/signup">Get started</a>
            <a class="button secondary" href="#/login">Login</a>
          </div>
        </div>
      </section>
      <section class="section">
        <h2>Features</h2>
        <p class="section-lead">ParkEase connects customers to available slots while giving vendors a live command center for lots, bookings, and occupancy.</p>
        <div class="grid">
          ${feature("Live availability", "Slot maps reflect bookings, manual occupancy, and availability changes as they happen.")}
          ${feature("Online booking", "Customers search lots by time and reserve open slots with backend validation.")}
          ${feature("Vendor control", "Vendors upload DXF lot layouts, manage slots, and handle walk-in bookings.")}
        </div>
      </section>
      <section class="section">
        <h2>How It Works</h2>
        <div class="grid">
          ${feature("1. Choose a role", "Customers book parking. Vendors manage lots and slot operations.")}
          ${feature("2. Search or manage", "Customers inspect availability; vendors monitor lots and incoming bookings.")}
          ${feature("3. Stay updated", "Redis and WebSockets deliver booking and slot changes without refreshes.")}
        </div>
      </section>
      <section class="section">
        <h2>Parking Management Overview</h2>
        <p class="section-lead">The system uses MongoDB parking lot, slot, booking, and user collections through the existing Express APIs. The dashboard surfaces those APIs directly, with no mock inventory or fake notification layer.</p>
        <div class="grid">
          ${feature("For customers", "Search lots, inspect slot maps, book slots, cancel upcoming bookings, and view history.")}
          ${feature("For vendors", "Create lots from DXF, review occupancy, change availability, and complete manual parking sessions.")}
          ${feature("Operational benefits", "Reduce idle capacity, prevent double-booking, and keep both sides synchronized.")}
        </div>
      </section>
      <section class="section">
        <div class="card">
          <h2>Ready to park smarter?</h2>
          <p>Sign up as a customer or vendor and use the live application workflow.</p>
          <a class="button" href="#/signup">Create account</a>
        </div>
      </section>
    </main>
  `);
}

function feature(title, body) {
  return `<article class="card"><h3>${title}</h3><p>${body}</p></article>`;
}

function renderLogin() {
  shell(`
    <main class="auth-wrap">
      <section class="card auth-card">
        <h2>Login</h2>
        <form class="form" id="login-form">
          <label>Email<input required type="email" name="email" autocomplete="email"></label>
          <label>Password<input required type="password" name="password" autocomplete="current-password"></label>
          <button class="button" type="submit">Login</button>
          <p class="muted small">New here? <a href="#/signup">Create an account</a>.</p>
        </form>
      </section>
    </main>
  `);
  document.querySelector("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await withButton(event.submitter, "Logging in...", async () => {
      const data = await api("/api/users/login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form)),
      });
      saveAuth({ token: data.token, user: data.user });
      toast("Welcome back");
      navigate(data.user.type === "Vendor" ? "/vendor" : "/customer");
    });
  });
}

function renderSignup() {
  shell(`
    <main class="auth-wrap">
      <section class="card auth-card">
        <h2>Signup</h2>
        <form class="form" id="signup-form">
          <div class="role-switch">
            <button type="button" class="active" data-role="Customer">Customer</button>
            <button type="button" data-role="Vendor">Vendor</button>
          </div>
          <input type="hidden" name="type" value="Customer">
          <label>Name<input required name="username" autocomplete="name"></label>
          <label>Email<input required type="email" name="email" autocomplete="email"></label>
          <label>Password<input required type="password" name="password" minlength="6" autocomplete="new-password"></label>
          <button class="button" type="submit">Create account</button>
        </form>
      </section>
    </main>
  `);
  document.querySelectorAll("[data-role]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-role]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      document.querySelector('[name="type"]').value = button.dataset.role;
    });
  });
  document.querySelector("#signup-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    await withButton(event.submitter, "Creating...", async () => {
      await api("/api/users/register", { method: "POST", body: JSON.stringify(payload) });
      const login = await api("/api/users/login", {
        method: "POST",
        body: JSON.stringify({ email: payload.email, password: payload.password }),
      });
      saveAuth({ token: login.token, user: login.user });
      toast("Account created");
      navigate(login.user.type === "Vendor" ? "/vendor" : "/customer");
    });
  });
}

async function renderCustomer() {
  connectWs();
  shell(`
    <main class="dashboard">
      <div class="dashboard-head">
        <div><h1>Customer Dashboard</h1><p>Search lots, inspect slot maps, and manage bookings.</p></div>
        <div class="head-actions">
          ${livePill()}
          <button class="button secondary" id="refresh-customer">Refresh</button>
        </div>
      </div>
      <div class="layout">
        <section class="stack">
          <div class="card">
            <h2>Find Parking</h2>
            <form class="form" id="search-form">
              <label>City<input name="city" placeholder="Optional city"></label>
              <label>Start<input required type="datetime-local" name="start"></label>
              <label>End<input required type="datetime-local" name="end"></label>
              <button class="button" type="submit">Search lots</button>
            </form>
          </div>
          <div class="card"><h2>Parking Lots</h2><div id="lots" class="lot-list empty">Search to load lots.</div></div>
        </section>
        <section class="stack">
          <div class="card" id="lot-detail">${empty("Select a lot to view availability.")}</div>
          <div class="card"><h2>Live Updates</h2><div id="event-feed">${eventFeed()}</div></div>
          <div class="card">
            <div class="dashboard-head">
              <div><h2>My Bookings</h2></div>
              <div class="segmented" id="booking-filter">
                <button class="active" data-filter="all">All</button>
                <button data-filter="active">Active</button>
                <button data-filter="history">History</button>
              </div>
            </div>
            <div id="booking-summary"></div>
            <div id="bookings">${empty("Loading bookings...")}</div>
          </div>
        </section>
      </div>
    </main>
  `);
  await setDefaultDates();
  document.querySelector("#search-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await loadCustomerLots();
  });
  document.querySelector("#refresh-customer").addEventListener("click", refreshCustomer);
  document.querySelector("#booking-filter").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.bookingFilter = button.dataset.filter;
    document.querySelectorAll("#booking-filter button").forEach((item) => item.classList.toggle("active", item === button));
    renderBookings();
  });
  await refreshCustomer();
}

async function refreshCustomer() {
  await Promise.allSettled([loadBookings(), loadCustomerLots(false)]);
  if (state.selectedLot) {
    await selectCustomerLot(state.selectedLot._id);
  }
}

async function loadCustomerLots(showErrors = true) {
  const form = document.querySelector("#search-form");
  if (!form) return;
  const values = Object.fromEntries(new FormData(form));
  if (!values.start) return;
  const params = new URLSearchParams({
    start: new Date(values.start).toISOString(),
    end: values.end ? new Date(values.end).toISOString() : "",
  });
  if (values.city) params.set("city", values.city);
  try {
    const data = await api(`/api/customers/showlots?${params}`);
    state.lots = data.data || [];
    renderLots();
  } catch (error) {
    state.lots = [];
    renderLots();
    if (showErrors) toast(error.message, "error");
  }
}

function renderLots() {
  const root = document.querySelector("#lots");
  if (!root) return;
  if (!state.lots.length) {
    root.className = "empty";
    root.textContent = "No lots found for this search.";
    return;
  }
  root.className = "lot-list";
  root.innerHTML = state.lots.map((lot) => `
    <button class="lot-item ${state.selectedLot?._id === lot._id ? "active" : ""}" data-lot="${lot._id}">
      <div class="lot-title"><span>${lot.name}</span><span>${lot.avaliableSlots ?? 0}/${lot.totalSlots ?? 0}</span></div>
      <div class="muted small">${lot.meta?.location?.AddressLine || lot.description || "Parking lot"}</div>
    </button>
  `).join("");
  root.querySelectorAll("[data-lot]").forEach((button) => {
    button.addEventListener("click", () => selectCustomerLot(button.dataset.lot));
  });
}

async function selectCustomerLot(lotId) {
  state.selectedLot = state.lots.find((lot) => lot._id === lotId);
  state.selectedSlots.clear();
  renderLots();
  const form = document.querySelector("#search-form");
  const values = Object.fromEntries(new FormData(form));
  const body = {
    startTimeVar: new Date(values.start).toISOString(),
    endTimeVar: new Date(values.end).toISOString(),
  };
  const data = await api(`/api/canvas/display/${lotId}/avaliability`, { method: "POST", body: JSON.stringify(body) });
  state.lotDisplay = data;
  renderCustomerLotDetail();
}

function renderCustomerLotDetail() {
  const root = document.querySelector("#lot-detail");
  const lot = state.selectedLot;
  if (!root || !lot) return;
  root.innerHTML = `
    <div class="dashboard-head">
      <div><h2>${lot.name}</h2><p>${lot.meta?.location?.AddressLine || lot.description || ""}</p></div>
      <button class="button" id="book-selected" disabled>Book selected</button>
    </div>
    ${slotCanvasHtml()}
    <div id="slot-inspector" class="slot-inspector">${slotInspector()}</div>
  `;
  drawSlotCanvas(document.querySelector("#slot-map"), state.lotDisplay, {
    selectable: true,
    onChange: () => {
      const button = document.querySelector("#book-selected");
      button.disabled = state.selectedSlots.size === 0;
      button.textContent = state.selectedSlots.size ? `Book ${state.selectedSlots.size} selected` : "Book selected";
      renderSlotInspector();
    },
  });
  document.querySelector("#book-selected").addEventListener("click", bookSelectedSlots);
}

async function bookSelectedSlots() {
  const form = document.querySelector("#search-form");
  const values = Object.fromEntries(new FormData(form));
  const payload = {
    slotids: [...state.selectedSlots],
    startTimeVar: new Date(values.start).toISOString(),
    endTimeVar: new Date(values.end).toISOString(),
  };
  await api(`/api/customers/bookslot/${state.selectedLot._id}`, { method: "POST", body: JSON.stringify(payload) });
  toast("Booking created");
  state.selectedSlots.clear();
  await loadBookings();
  await selectCustomerLot(state.selectedLot._id);
}

async function loadBookings() {
  const data = await api("/api/customers/mybookings");
  state.bookings = data.data || [];
  renderBookings();
}

function renderBookings() {
  const root = document.querySelector("#bookings");
  if (!root) return;
  const summary = document.querySelector("#booking-summary");
  if (summary) summary.innerHTML = customerBookingSummary();
  const bookings = filteredBookings();
  if (!bookings.length) {
    root.innerHTML = empty("No bookings yet.");
    return;
  }
  root.innerHTML = bookingTable(bookings, true);
  root.querySelectorAll("[data-cancel]").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`/api/customers/cancelbooking/${button.dataset.cancel}`, { method: "PATCH" });
      toast("Booking cancelled");
      await loadBookings();
    });
  });
}

function filteredBookings() {
  if (state.bookingFilter === "active") return state.bookings.filter((booking) => ["upcoming", "active"].includes(booking.status));
  if (state.bookingFilter === "history") return state.bookings.filter((booking) => ["completed", "cancelled"].includes(booking.status));
  return state.bookings;
}

function customerBookingSummary() {
  const active = state.bookings.filter((booking) => booking.status === "active").length;
  const upcoming = state.bookings.filter((booking) => booking.status === "upcoming").length;
  const history = state.bookings.filter((booking) => ["completed", "cancelled"].includes(booking.status)).length;
  return `<div class="stat-grid compact">${stat("Active", active)}${stat("Upcoming", upcoming)}${stat("History", history)}${stat("Total", state.bookings.length)}</div>`;
}

async function renderVendor() {
  connectWs();
  shell(`
    <main class="dashboard">
      <div class="dashboard-head">
        <div><h1>Vendor Dashboard</h1><p>Create lots, monitor live occupancy, and manage bookings.</p></div>
        <div class="head-actions">
          ${livePill()}
          <button class="button secondary" id="refresh-vendor">Refresh</button>
        </div>
      </div>
      <div class="layout">
        <section class="stack">
          <div class="card">
            <h2>Create Parking Lot</h2>
            <form class="form" id="upload-form">
              <div class="form-row">
                <label>Name<input required name="name"></label>
                <label>Hourly rate<input required type="number" min="0" name="hourlyRates"></label>
              </div>
              <label>Description<textarea name="description"></textarea></label>
              <div class="form-row">
                <label>Units<select name="units"><option>mm</option><option>m</option><option>cm</option><option>ft</option><option>inches</option><option>km</option></select></label>
                <label>DXF file<input required type="file" name="dxfFile" accept=".dxf"></label>
              </div>
              <div class="form-row">
                <label>Latitude<input required type="number" step="any" name="latitude"></label>
                <label>Longitude<input required type="number" step="any" name="longitude"></label>
              </div>
              <label>Address<input required name="AddressLine"></label>
              <div class="form-row">
                <label>City<input required name="City"></label>
                <label>State<input required name="State"></label>
              </div>
              <label>Pincode<input required name="Pincode"></label>
              <button class="button" type="submit">Upload lot</button>
            </form>
          </div>
          <div class="card"><h2>My Lots</h2><div id="vendor-lots" class="lot-list">${empty("Loading lots...")}</div></div>
        </section>
        <section class="stack">
          <div class="card" id="vendor-detail">${empty("Select a lot to manage live slots.")}</div>
          <div class="card"><h2>Live Updates</h2><div id="event-feed">${eventFeed()}</div></div>
          <div class="card">
            <div class="dashboard-head">
              <div><h2>Lot Bookings</h2></div>
              <button class="button ghost" id="export-bookings" disabled>Export CSV</button>
            </div>
            <div id="vendor-bookings">${empty("Select a lot to view bookings.")}</div>
          </div>
        </section>
      </div>
    </main>
  `);
  document.querySelector("#refresh-vendor").addEventListener("click", loadVendorLots);
  document.querySelector("#upload-form").addEventListener("submit", uploadLot);
  document.querySelector("#export-bookings").addEventListener("click", exportVendorBookings);
  await loadVendorLots();
}

async function uploadLot(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  await withButton(event.submitter, "Uploading...", async () => {
    await api("/api/vendors/upload/", { method: "POST", body: form });
    toast("Parking lot created");
    event.currentTarget.reset();
    await loadVendorLots();
  });
}

async function loadVendorLots() {
  const data = await api("/api/vendors/lots");
  state.lots = data.data || [];
  renderVendorLots();
}

function renderVendorLots() {
  const root = document.querySelector("#vendor-lots");
  if (!root) return;
  if (!state.lots.length) {
    root.innerHTML = empty("No lots created yet.");
    return;
  }
  root.className = "lot-list";
  root.innerHTML = state.lots.map((lot) => `
    <button class="lot-item ${state.selectedLot?._id === lot._id ? "active" : ""}" data-lot="${lot._id}">
      <div class="lot-title"><span>${lot.name}</span><span>Rs ${lot.hourlyRates ?? 0}/hr</span></div>
      <div class="muted small">${lot.meta?.location?.AddressLine || lot.description || "Parking lot"}</div>
    </button>
  `).join("");
  root.querySelectorAll("[data-lot]").forEach((button) => {
    button.addEventListener("click", () => selectVendorLot(button.dataset.lot));
  });
}

async function selectVendorLot(lotId) {
  state.selectedLot = state.lots.find((lot) => lot._id === lotId) || state.selectedLot;
  state.selectedSlots.clear();
  renderVendorLots();
  await refreshVendorSelectedLot(lotId);
  reconnectWsForLot(lotId);
}

async function refreshVendorSelectedLot(lotId) {
  const data = await api(`/api/vendors/lot/display/${lotId}`);
  state.lotDisplay = data.data;
  renderVendorLotDetail();
  await loadVendorBookings(lotId);
}

function renderVendorLotDetail() {
  const root = document.querySelector("#vendor-detail");
  if (!root || !state.selectedLot) return;
  const slots = state.lotDisplay?.slots || [];
  const stats = {
    total: slots.length,
    avaliable: slots.filter((slot) => slot.status === "avaliable").length,
    booked: slots.filter((slot) => slot.status === "booked").length,
    unavaliable: slots.filter((slot) => slot.status === "unavaliable").length,
  };
  root.innerHTML = `
    <div class="dashboard-head">
      <div><h2>${state.selectedLot.name}</h2><p>${state.selectedLot.meta?.location?.AddressLine || ""}</p></div>
    </div>
    <div class="stat-grid">
      ${stat("Total", stats.total)}
      ${stat("Available", stats.avaliable)}
      ${stat("Booked", stats.booked)}
      ${stat("Unavailable", stats.unavaliable)}
    </div>
    <div style="height:14px"></div>
    ${slotCanvasHtml()}
    <div id="slot-inspector" class="slot-inspector">${slotInspector()}</div>
    <div class="toolbar">
      <button class="button" id="manual-book" disabled>Manual book</button>
      <button class="button secondary" id="manual-complete" disabled>Complete manual</button>
      <button class="button ghost" id="make-available" disabled>Set available</button>
      <button class="button danger" id="make-unavailable" disabled>Set unavailable</button>
    </div>
  `;
  drawSlotCanvas(document.querySelector("#slot-map"), state.lotDisplay, {
    selectable: true,
    onChange: updateVendorSlotButtons,
  });
  document.querySelector("#manual-book").addEventListener("click", () => actOnOneSlot("manualbooking"));
  document.querySelector("#manual-complete").addEventListener("click", () => actOnOneSlot("manualcomplete"));
  document.querySelector("#make-available").addEventListener("click", () => changeSlotStatus("avaliable"));
  document.querySelector("#make-unavailable").addEventListener("click", () => changeSlotStatus("unavaliable"));
}

function updateVendorSlotButtons() {
  const count = state.selectedSlots.size;
  ["manual-book", "manual-complete"].forEach((id) => document.querySelector(`#${id}`).disabled = count !== 1);
  ["make-available", "make-unavailable"].forEach((id) => document.querySelector(`#${id}`).disabled = count === 0);
  renderSlotInspector();
}

function livePill() {
  const label = state.wsStatus === "online" ? "Live" : state.wsStatus === "connecting" ? "Connecting" : "Offline";
  return `<span class="live-pill ${state.wsStatus}"><span></span>${label}</span>`;
}

function renderLiveStatus() {
  const label = state.wsStatus === "online" ? "Live" : state.wsStatus === "connecting" ? "Connecting" : "Offline";
  document.querySelectorAll(".live-pill").forEach((node) => {
    node.className = `live-pill ${state.wsStatus}`;
    node.innerHTML = `<span></span>${label}`;
  });
}

function pushEvent(type, payload = {}) {
  state.events.unshift({
    label: notificationText({ type }),
    detail: [payload.lotId && `Lot ${String(payload.lotId).slice(-6)}`, payload.slotId && `Slot ${String(payload.slotId).slice(-6)}`, payload.status].filter(Boolean).join(" - "),
    time: new Date(),
  });
  state.events = state.events.slice(0, 8);
  renderEventFeed();
}

function eventFeed() {
  if (!state.events.length) return empty("No live events yet.");
  return `
    <div class="event-feed">
      ${state.events.map((event) => `
        <div class="event-item">
          <strong>${event.label}</strong>
          <span>${event.detail || "ParkEase update"}</span>
          <small>${event.time.toLocaleTimeString()}</small>
        </div>
      `).join("")}
    </div>
  `;
}

function renderEventFeed() {
  const root = document.querySelector("#event-feed");
  if (root) root.innerHTML = eventFeed();
}

function slotInspector() {
  const slots = state.lotDisplay?.slots || [];
  const selected = [...state.selectedSlots].map((id) => slots.find((slot) => slot._id === id)).filter(Boolean);
  if (!selected.length) return "Select a slot on the map to inspect or manage it.";
  return selected.map((slot) => `<span><strong>${slot.name || String(slot._id).slice(-6)}</strong> <em class="badge ${slot.status}">${slot.status}</em> ${slot.slotType || "normal"}</span>`).join("");
}

function renderSlotInspector() {
  const root = document.querySelector("#slot-inspector");
  if (root) root.innerHTML = slotInspector();
}

async function actOnOneSlot(action) {
  const slotId = [...state.selectedSlots][0];
  await api(`/api/vendors/lot/${action}/${state.selectedLot._id}/${slotId}`, { method: "PATCH" });
  toast(action === "manualbooking" ? "Manual booking started" : "Manual booking completed");
  await selectVendorLot(state.selectedLot._id);
}

async function changeSlotStatus(statusto) {
  await api(`/api/vendors/lot/changestatus/${state.selectedLot._id}`, {
    method: "PATCH",
    body: JSON.stringify({ slotIds: [...state.selectedSlots], statusto }),
  });
  toast("Slot availability updated");
  await selectVendorLot(state.selectedLot._id);
}

async function loadVendorBookings(lotId) {
  const data = await api(`/api/vendors/lot/${lotId}/bookings`);
  state.vendorBookings = data.data || [];
  const root = document.querySelector("#vendor-bookings");
  if (!root) return;
  const exportButton = document.querySelector("#export-bookings");
  if (exportButton) exportButton.disabled = state.vendorBookings.length === 0;
  root.innerHTML = state.vendorBookings.length ? bookingTable(state.vendorBookings, false) : empty("No bookings for this lot.");
}

function exportVendorBookings() {
  const rows = [["Lot", "Slot", "Customer", "Start", "End", "Status", "Type"]];
  state.vendorBookings.forEach((booking) => {
    rows.push([
      booking.lotId?.name || state.selectedLot?.name || "",
      booking.slotId?.name || booking.slotId?._id || "",
      booking.userId?.username || "",
      booking.startTime || "",
      booking.endTime || "",
      booking.status || "",
      booking.type || "",
    ]);
  });
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${state.selectedLot?.name || "lot"}-bookings.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function slotCanvasHtml() {
  const customer = state.auth?.user?.type === "Customer";
  return `
    <div class="canvas-wrap">
      <canvas class="slot-map" id="slot-map"></canvas>
      <div class="legend">
        <span><i class="dot available"></i>Available</span>
        <span><i class="dot booked"></i>Booked</span>
        <span><i class="dot mine"></i>${customer ? "Booked by me" : "Manual booking"}</span>
        <span><i class="dot unavailable"></i>Unavailable</span>
        <span><i class="dot selected"></i>Selected</span>
      </div>
    </div>
  `;
}

function drawSlotCanvas(canvas, data, options = {}) {
  if (!canvas || !data?.boundary?.vertices?.length) return;
  state.canvasOptions = options;
  const ctx = canvas.getContext("2d");
  const hitCanvas = document.createElement("canvas");
  const hitCtx = hitCanvas.getContext("2d", { willReadFrequently: true });
  const boundary = data.boundary;
  const slots = data.slots || [];
  const allVertices = [boundary.vertices, ...slots.map((slot) => slot.vertices || [])].flat();
  const box = getBoundingBox(allVertices);
  const width = Math.max(320, Math.floor(canvas.parentElement?.clientWidth || canvas.clientWidth || 700));
  const naturalRatio = box.height / Math.max(box.width, 1);
  const height = Math.max(320, Math.min(620, Math.round(width * Math.min(1.15, Math.max(0.55, naturalRatio)))));
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  hitCanvas.width = canvas.width;
  hitCanvas.height = canvas.height;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  hitCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const padding = 22;
  const scale = Math.min((width - padding * 2) / Math.max(box.width, 1), (height - padding * 2) / Math.max(box.height, 1));
  const drawnWidth = box.width * scale;
  const drawnHeight = box.height * scale;
  const offsetX = (width - drawnWidth) / 2 - box.minX * scale;
  const offsetY = (height - drawnHeight) / 2 - box.minY * scale;
  const mapVertex = (v) => ({ x: offsetX + v.x * scale, y: offsetY + v.y * scale });
  ctx.clearRect(0, 0, width, height);
  hitCtx.clearRect(0, 0, width, height);
  drawPolygon(ctx, boundary.vertices.map(mapVertex), "rgba(255,255,255,0.45)", true);
  slots.forEach((slot, index) => {
    drawPolygon(ctx, slot.vertices.map(mapVertex), slotColor(slot));
    drawPolygon(hitCtx, slot.vertices.map(mapVertex), indexToColor(index + 1), false);
  });
  if (options.selectable) {
    canvas.onclick = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) * (canvas.width / rect.width);
      const y = (event.clientY - rect.top) * (canvas.height / rect.height);
      const pixel = hitCtx.getImageData(x, y, 1, 1).data;
      const slot = slots[colorToIndex(pixel) - 1];
      if (!slot) return;
      if (isBookedByCurrentCustomer(slot)) return toast("You already booked this slot", "success");
      if (slot.status === "booked" && state.auth.user.type === "Customer") return toast("That slot is already booked", "error");
      if (slot.status === "unavaliable" && state.auth.user.type === "Customer") return toast("That slot is unavailable", "error");
      if (state.selectedSlots.has(slot._id)) state.selectedSlots.delete(slot._id);
      else state.selectedSlots.add(slot._id);
      drawSlotCanvas(canvas, data, options);
      options.onChange?.();
    };
  }
}

function indexToColor(index) {
  const r = index & 255;
  const g = (index >> 8) & 255;
  const b = (index >> 16) & 255;
  return `rgb(${r},${g},${b})`;
}

function colorToIndex(pixel) {
  return pixel[0] + (pixel[1] << 8) + (pixel[2] << 16);
}

function drawPolygon(ctx, points, fill, stroke = true) {
  ctx.beginPath();
  points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = "rgba(23,32,51,0.45)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function slotColor(slot) {
  if (state.selectedSlots.has(slot._id)) return "#d99122";
  if (state.auth?.user?.type === "Customer" && isBookedByCurrentCustomer(slot)) return "#2563eb";
  if (state.auth?.user?.type === "Vendor" && slot.status === "booked" && slot.bookingType === "manual") return "#2563eb";
  if (slot.status === "booked") return "#c7433b";
  if (slot.status === "unavaliable") return "#4b5563";
  return "#29a66a";
}

function isBookedByCurrentCustomer(slot) {
  const lotId = state.selectedLot?._id;
  if (!lotId) return false;
  const range = currentSearchRange();
  return state.bookings.some((booking) => {
    const bookingSlotId = typeof booking.slotId === "string" ? booking.slotId : booking.slotId?._id;
    const bookingLotId = typeof booking.lotId === "string" ? booking.lotId : booking.lotId?._id;
    if (bookingSlotId !== slot._id || bookingLotId !== lotId) return false;
    if (!["upcoming", "active"].includes(booking.status)) return false;
    if (!range) return true;
    return rangesOverlap(new Date(booking.startTime), booking.endTime ? new Date(booking.endTime) : null, range.start, range.end);
  });
}

function currentSearchRange() {
  const form = document.querySelector("#search-form");
  if (!form) return null;
  const values = Object.fromEntries(new FormData(form));
  if (!values.start || !values.end) return null;
  return { start: new Date(values.start), end: new Date(values.end) };
}

function rangesOverlap(startA, endA, startB, endB) {
  const aEnd = endA || new Date(8640000000000000);
  return startA < endB && aEnd > startB;
}

function getBoundingBox(vertices) {
  return vertices.reduce((box, v) => ({
    minX: Math.min(box.minX, v.x),
    minY: Math.min(box.minY, v.y),
    maxX: Math.max(box.maxX, v.x),
    maxY: Math.max(box.maxY, v.y),
    width: Math.max(box.maxX, v.x) - Math.min(box.minX, v.x),
    height: Math.max(box.maxY, v.y) - Math.min(box.minY, v.y),
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, width: 0, height: 0 });
}

function bookingTable(bookings, customer) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Lot</th><th>Slot</th><th>Customer</th><th>Time</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${bookings.map((booking) => `
            <tr>
              <td>${booking.lotId?.name || "-"}</td>
              <td>${booking.slotId?.name || booking.slotId?._id || "-"}</td>
              <td>${booking.userId?.username || (customer ? state.auth.user.username : "-")}</td>
              <td>${formatDate(booking.startTime)}<br><span class="muted small">${booking.endTime ? formatDate(booking.endTime) : "Open ended"}</span></td>
              <td><span class="badge ${booking.status}">${booking.status}</span></td>
              <td>${customer && booking.status === "upcoming" ? `<button class="button ghost" data-cancel="${booking._id}">Cancel</button>` : ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function stat(label, value) {
  return `<div class="stat"><strong>${value}</strong><span class="muted small">${label}</span></div>`;
}

function empty(message) {
  return `<div class="empty">${message}</div>`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

async function setDefaultDates() {
  const start = document.querySelector('[name="start"]');
  const end = document.querySelector('[name="end"]');
  let now = new Date();
  try {
    const data = await api("/api/users/time");
    now = new Date(data.now);
  } catch {
    now = new Date();
  }
  const later = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  start.value = toLocalInput(now);
  end.value = toLocalInput(later);
}

function toLocalInput(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

async function withButton(button, text, fn) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = text;
  try {
    await fn();
  } catch (error) {
    toast(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function connectWs() {
  if (!state.auth?.token || state.ws) return;
  reconnectWsForLot(state.selectedLot?._id);
}

function reconnectWsForLot(lotId) {
  disconnectWs();
  if (!state.auth?.token) return;
  state.wsStatus = "connecting";
  renderLiveStatus();
  const params = new URLSearchParams({ token: state.auth.token });
  if (lotId) params.set("lotId", lotId);
  const ws = new WebSocket(`${WS_BASE}?${params}`);
  state.ws = ws;
  ws.onopen = () => {
    state.wsStatus = "online";
    renderLiveStatus();
  };
  ws.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "connection.ready") return;
    pushEvent(message.type, message.payload);
    toast(notificationText(message), "success");
    if (state.auth.user.type === "Customer") await refreshCustomer();
    if (state.auth.user.type === "Vendor" && state.selectedLot) await refreshVendorSelectedLot(state.selectedLot._id);
  };
  ws.onclose = () => {
    if (state.ws === ws) {
      state.ws = null;
      state.wsStatus = "offline";
      renderLiveStatus();
    }
  };
  ws.onerror = () => {
    state.wsStatus = "offline";
    renderLiveStatus();
  };
}

function disconnectWs() {
  if (state.ws) {
    const ws = state.ws;
    state.ws = null;
    state.wsStatus = "offline";
    renderLiveStatus();
    ws.close();
  }
}

function notificationText(message) {
  const map = {
    "slot.avaliability.update": "Slot status changed",
    "booking.created": "New booking received",
    "booking.cancelled": "Booking cancelled",
    "booking.status.update": "Booking status updated",
  };
  return map[message.type] || "Live update received";
}

window.addEventListener("hashchange", route);
window.addEventListener("resize", () => {
  if (state.lotDisplay) {
    const canvas = document.querySelector("#slot-map");
    if (canvas) drawSlotCanvas(canvas, state.lotDisplay, state.canvasOptions || { selectable: true });
  }
});
route();
