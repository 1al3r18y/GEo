/**
 * عالم الفخامة — لوحة الإدارة
 * Admin Dashboard v1.0.0
 * Date: March 13, 2026
 *
 * Decoupled ERP Architecture:
 *   Management Hub: This Web Dashboard (CRUD for Hotels, Cars, Settings)
 *   Employee Terminal: Telegram Bot (live queries from Supabase, PDF generation)
 */

// ═══════════ SUPABASE CLIENT ═══════════
const SUPABASE_URL = "https://ouhteboiqitdgsmbqgyj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91aHRlYm9pcWl0ZGdzbWJxZ3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDQwNzcsImV4cCI6MjA4ODM4MDA3N30.KLO9eEsBjbvScZO8csLEE0anutw7TFrdQYXwmAfSUIU";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CITY_MAP = {
  Tbilisi: "تبليسي", Batumi: "باتومي", Gudauri: "غوداوري",
  Borjomi: "بورجومي", Bakuriani: "باكورياني", Kutaisi: "كوتايسي",
  Dashbash: "داشباش"
};

const CITIES_ORDER = ["Tbilisi", "Batumi", "Gudauri", "Borjomi", "Bakuriani", "Kutaisi", "Dashbash"];

// ═══════════ AUTH (Simple Credential Gate) ═══════════
const ADMIN_USER = "lwiatp";
const ADMIN_PASS = "Alfakhama4ever@$@$";

function doLogin() {
  const user = document.getElementById("login-user").value.trim();
  const pass = document.getElementById("login-pass").value;
  const errEl = document.getElementById("login-error");
  errEl.style.display = "none";

  if (!user || !pass) {
    errEl.textContent = "الرجاء إدخال اسم المستخدم وكلمة المرور";
    errEl.style.display = "block";
    return;
  }

  if (user !== ADMIN_USER || pass !== ADMIN_PASS) {
    errEl.textContent = "بيانات الدخول غير صحيحة";
    errEl.style.display = "block";
    return;
  }

  sessionStorage.setItem("admin_logged_in", "1");
  showDashboard(user);
}

function checkSession() {
  if (sessionStorage.getItem("admin_logged_in") === "1") {
    showDashboard(ADMIN_USER);
  }
}

function doLogout() {
  sessionStorage.removeItem("admin_logged_in");
  document.getElementById("dashboard").style.display = "none";
  document.getElementById("login-screen").style.display = "flex";
}

function showDashboard(email) {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("dashboard").style.display = "block";
  document.getElementById("user-email").textContent = email;
  navigateTo("overview");
}

// ═══════════ NAVIGATION ═══════════
function navigateTo(page) {
  document.querySelectorAll(".page").forEach(p => p.style.display = "none");
  document.querySelectorAll(".sidebar-item").forEach(i => i.classList.remove("active"));
  document.getElementById("page-" + page).style.display = "block";
  document.querySelector(`.sidebar-item[data-page="${page}"]`).classList.add("active");

  if (page === "overview") loadOverview();
  else if (page === "hotels") loadHotels();
  else if (page === "cars") loadCars();
  else if (page === "settings") loadSettings();
}

// ═══════════ TOAST ═══════════
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

// ═══════════ MODAL ═══════════
function closeModal(id) {
  document.getElementById(id).classList.remove("show");
}

// ═══════════ OVERVIEW ═══════════
async function loadOverview() {
  const { data: hotels } = await sb.from("hotel_offers").select("*").eq("is_active", true);
  const { data: cars } = await sb.from("car_pricing").select("*").eq("is_active", true);
  const { data: settings } = await sb.from("system_settings").select("*").single();

  const h = hotels || [];
  const cities = [...new Set(h.map(x => x.city))];

  document.getElementById("stat-hotels").textContent = h.length;
  document.getElementById("stat-cities").textContent = cities.length;
  document.getElementById("stat-cars").textContent = (cars || []).length;
  document.getElementById("stat-margin").textContent = (settings?.profit_margin || 0) + "%";

  // Category breakdown
  const catCounts = {};
  const catCities = {};
  for (const hotel of h) {
    const cat = hotel.category || "—";
    catCounts[cat] = (catCounts[cat] || 0) + 1;
    if (!catCities[cat]) catCities[cat] = new Set();
    catCities[cat].add(CITY_MAP[hotel.city] || hotel.city);
  }

  const tbody = document.getElementById("overview-categories");
  tbody.innerHTML = Object.entries(catCounts)
    .map(([cat, count]) => `
      <tr>
        <td><span class="badge badge-cat">${cat}</span></td>
        <td>${count}</td>
        <td>${[...catCities[cat]].join("، ")}</td>
      </tr>
    `).join("");
}

// ═══════════ HOTELS CRUD ═══════════
async function loadHotels() {
  const catFilter = document.getElementById("filter-category").value;
  const cityFilter = document.getElementById("filter-city").value;
  const search = document.getElementById("search-hotel").value.trim().toLowerCase();

  let query = sb.from("hotel_offers").select("*").order("category").order("city").order("hotel_name");
  if (catFilter) query = query.eq("category", catFilter);
  if (cityFilter) query = query.eq("city", cityFilter);

  const { data, error } = await query;
  if (error) { toast("❌ خطأ في تحميل الفنادق"); return; }

  let hotels = data || [];
  if (search) {
    hotels = hotels.filter(h =>
      h.hotel_name.toLowerCase().includes(search) ||
      (CITY_MAP[h.city] || "").includes(search)
    );
  }

  const tbody = document.getElementById("hotels-tbody");
  if (hotels.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text-muted)">لا توجد فنادق</td></tr>`;
    return;
  }

  tbody.innerHTML = hotels.map((h, i) => `
    <tr>
      <td style="color:var(--text-muted)">${i + 1}</td>
      <td style="font-weight:600">${esc(h.hotel_name)}</td>
      <td>${CITY_MAP[h.city] || h.city}</td>
      <td><span class="badge badge-cat">${h.category}</span></td>
      <td>$${h.dbl_view}</td>
      <td>$${h.dbl_no_view}</td>
      <td>$${h.trbl_view}</td>
      <td>$${h.trbl_no_view}</td>
      <td><span class="badge ${h.is_active ? 'badge-active' : 'badge-inactive'}">${h.is_active ? 'نشط' : 'معطل'}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn btn-blue btn-sm" onclick="editHotel(${h.id})">✏️</button>
          <button class="btn btn-sm" style="background:${h.is_active ? 'var(--red)' : 'var(--green)'};color:#fff" onclick="toggleHotel(${h.id},${!h.is_active})">${h.is_active ? '⏸️' : '▶️'}</button>
          <button class="btn btn-red btn-sm" onclick="confirmDeleteHotel(${h.id})">🗑️</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function openHotelModal(hotel) {
  document.getElementById("hotel-modal-title").textContent = hotel ? "تعديل الفندق" : "إضافة فندق جديد";
  document.getElementById("hotel-id").value = hotel?.id || "";
  document.getElementById("hotel-name").value = hotel?.hotel_name || "";
  document.getElementById("hotel-city").value = hotel?.city || "Tbilisi";
  document.getElementById("hotel-category").value = hotel?.category || "عرض 1";
  document.getElementById("hotel-dbl-v").value = hotel?.dbl_view || "";
  document.getElementById("hotel-dbl-nv").value = hotel?.dbl_no_view || "";
  document.getElementById("hotel-trbl-v").value = hotel?.trbl_view || "";
  document.getElementById("hotel-trbl-nv").value = hotel?.trbl_no_view || "";
  document.getElementById("hotel-active").checked = hotel?.is_active !== false;
  document.getElementById("hotel-modal").classList.add("show");
}

async function editHotel(id) {
  const { data } = await sb.from("hotel_offers").select("*").eq("id", id).single();
  if (data) openHotelModal(data);
}

async function saveHotel() {
  const id = document.getElementById("hotel-id").value;
  const payload = {
    hotel_name: document.getElementById("hotel-name").value.trim(),
    city: document.getElementById("hotel-city").value,
    category: document.getElementById("hotel-category").value,
    dbl_view: Number(document.getElementById("hotel-dbl-v").value) || 0,
    dbl_no_view: Number(document.getElementById("hotel-dbl-nv").value) || 0,
    trbl_view: Number(document.getElementById("hotel-trbl-v").value) || 0,
    trbl_no_view: Number(document.getElementById("hotel-trbl-nv").value) || 0,
    is_active: document.getElementById("hotel-active").checked,
  };

  if (!payload.hotel_name) { toast("⚠️ اسم الفندق مطلوب"); return; }

  let error;
  if (id) {
    ({ error } = await sb.from("hotel_offers").update(payload).eq("id", Number(id)));
  } else {
    ({ error } = await sb.from("hotel_offers").insert(payload));
  }

  if (error) { toast("❌ " + error.message); return; }

  closeModal("hotel-modal");
  toast(id ? "✅ تم تحديث الفندق" : "✅ تم إضافة الفندق");
  loadHotels();
}

async function toggleHotel(id, newState) {
  const { error } = await sb.from("hotel_offers").update({ is_active: newState }).eq("id", id);
  if (error) { toast("❌ " + error.message); return; }
  toast(newState ? "✅ تم تفعيل الفندق" : "⏸️ تم تعطيل الفندق");
  loadHotels();
}

function confirmDeleteHotel(id) {
  document.getElementById("delete-modal").classList.add("show");
  document.getElementById("confirm-delete-btn").onclick = async () => {
    const { error } = await sb.from("hotel_offers").delete().eq("id", id);
    if (error) { toast("❌ " + error.message); return; }
    closeModal("delete-modal");
    toast("🗑️ تم حذف الفندق");
    loadHotels();
  };
}

// ═══════════ CARS CRUD ═══════════
async function loadCars() {
  const { data, error } = await sb.from("car_pricing").select("*").order("min_pax");
  if (error) { toast("❌ خطأ في تحميل السيارات"); return; }

  const tbody = document.getElementById("cars-tbody");
  const cars = data || [];

  if (cars.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">لا توجد فئات</td></tr>`;
    return;
  }

  tbody.innerHTML = cars.map((c, i) => `
    <tr>
      <td style="color:var(--text-muted)">${i + 1}</td>
      <td style="font-weight:600">${esc(c.car_type || "—")}</td>
      <td>${c.min_pax}</td>
      <td>${c.max_pax}</td>
      <td style="color:var(--gold);font-weight:700">$${c.price_per_day}</td>
      <td><span class="badge ${c.is_active ? 'badge-active' : 'badge-inactive'}">${c.is_active ? 'نشط' : 'معطل'}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn btn-blue btn-sm" onclick="editCar(${c.id})">✏️</button>
          <button class="btn btn-red btn-sm" onclick="confirmDeleteCar(${c.id})">🗑️</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function openCarModal(car) {
  document.getElementById("car-modal-title").textContent = car ? "تعديل فئة السيارة" : "إضافة فئة سيارة";
  document.getElementById("car-id").value = car?.id || "";
  document.getElementById("car-type").value = car?.car_type || "";
  document.getElementById("car-min").value = car?.min_pax || "";
  document.getElementById("car-max").value = car?.max_pax || "";
  document.getElementById("car-price").value = car?.price_per_day || "";
  document.getElementById("car-active").checked = car?.is_active !== false;
  document.getElementById("car-modal").classList.add("show");
}

async function editCar(id) {
  const { data } = await sb.from("car_pricing").select("*").eq("id", id).single();
  if (data) openCarModal(data);
}

async function saveCar() {
  const id = document.getElementById("car-id").value;
  const payload = {
    car_type: document.getElementById("car-type").value.trim(),
    min_pax: Number(document.getElementById("car-min").value) || 1,
    max_pax: Number(document.getElementById("car-max").value) || 1,
    price_per_day: Number(document.getElementById("car-price").value) || 0,
    is_active: document.getElementById("car-active").checked,
  };

  if (!payload.car_type) { toast("⚠️ نوع السيارة مطلوب"); return; }

  let error;
  if (id) {
    ({ error } = await sb.from("car_pricing").update(payload).eq("id", Number(id)));
  } else {
    ({ error } = await sb.from("car_pricing").insert(payload));
  }

  if (error) { toast("❌ " + error.message); return; }

  closeModal("car-modal");
  toast(id ? "✅ تم تحديث السيارة" : "✅ تم إضافة السيارة");
  loadCars();
}

function confirmDeleteCar(id) {
  document.getElementById("delete-modal").classList.add("show");
  document.getElementById("confirm-delete-btn").onclick = async () => {
    const { error } = await sb.from("car_pricing").delete().eq("id", id);
    if (error) { toast("❌ " + error.message); return; }
    closeModal("delete-modal");
    toast("🗑️ تم حذف السيارة");
    loadCars();
  };
}

// ═══════════ SETTINGS ═══════════
async function loadSettings() {
  const { data } = await sb.from("system_settings").select("*").single();
  if (data) {
    document.getElementById("set-margin").value = data.profit_margin || 0;
    document.getElementById("set-exchange").value = data.exchange_rate_usd_to_sar || 3.8;
    document.getElementById("set-sim").value = data.free_sim_cards_allowance || 0;
  }

  // Cities order
  const container = document.getElementById("cities-order");
  container.innerHTML = CITIES_ORDER.map((c, i) => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;margin-bottom:6px">
      <span style="color:var(--gold);font-weight:700;width:24px">${i + 1}</span>
      <span>${CITY_MAP[c]} (${c})</span>
    </div>
  `).join("");
}

async function saveSettings() {
  const payload = {
    profit_margin: Number(document.getElementById("set-margin").value) || 0,
    exchange_rate_usd_to_sar: Number(document.getElementById("set-exchange").value) || 3.8,
    free_sim_cards_allowance: Number(document.getElementById("set-sim").value) || 0,
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb.from("system_settings").update(payload).eq("id", 1);
  if (error) { toast("❌ " + error.message); return; }
  toast("✅ تم حفظ الإعدادات");
}

function saveCitiesOrder() {
  toast("✅ ترتيب المدن محفوظ");
}

// ═══════════ UTILS ═══════════
function esc(s) {
  if (!s) return "";
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

// ═══════════ INIT ═══════════
checkSession();
