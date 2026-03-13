// ═══ Strict Hotel Matrix Seeder — v12.0.0 ═══
const SUPABASE_URL = "https://ouhteboiqitdgsmbqgyj.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91aHRlYm9pcWl0ZGdzbWJxZ3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDQwNzcsImV4cCI6MjA4ODM4MDA3N30.KLO9eEsBjbvScZO8csLEE0anutw7TFrdQYXwmAfSUIU";
const HEADERS = { "apikey": ANON_KEY, "Authorization": `Bearer ${ANON_KEY}`, "Content-Type": "application/json", "Prefer": "return=minimal" };

// ─── Common hotel blocks (shared by multiple tiers) ───
const T1_COMMON = [
  { city: "Bakuriani", hotel_name: "Bakuraini inn", dbl_view: 80, trbl_view: 135, dbl_no_view: 70, trbl_no_view: 120 },
  { city: "Dashbash", hotel_name: "Kass Land Diamond", dbl_view: 110, trbl_view: 160, dbl_no_view: 110, trbl_no_view: 160 },
  { city: "Batumi", hotel_name: "Luxury view batumi", dbl_view: 90, trbl_view: 110, dbl_no_view: 80, trbl_no_view: 95 },
  { city: "Gudauri", hotel_name: "Gudauri inn", dbl_view: 140, trbl_view: 160, dbl_no_view: 140, trbl_no_view: 160 },
  { city: "Borjomi", hotel_name: "Borjomi likani", dbl_view: 150, trbl_view: 200, dbl_no_view: 140, trbl_no_view: 180 },
];

function makeTier(category, tbilisiHotel, gudauriOverride) {
  const rows = [
    { city: "Tbilisi", ...tbilisiHotel, category, is_active: true },
  ];
  for (const h of T1_COMMON) {
    const row = { ...h, category, is_active: true };
    if (gudauriOverride && h.city === "Gudauri") {
      Object.assign(row, gudauriOverride);
    }
    rows.push(row);
  }
  return rows;
}

const TBILISI_T1 = { hotel_name: "Episoide tbilisi", dbl_view: 70, trbl_view: 95, dbl_no_view: 70, trbl_no_view: 95 };
const TBILISI_T2 = { hotel_name: "Marjan palza", dbl_view: 100, trbl_view: 145, dbl_no_view: 100, trbl_no_view: 145 };
const TBILISI_T3 = { hotel_name: "Radisson red tbilisi", dbl_view: 140, trbl_view: 160, dbl_no_view: 140, trbl_no_view: 160 };
const GUDAURI_T3 = { hotel_name: "monte Gudauri", dbl_view: 160, trbl_view: 180, dbl_no_view: 160, trbl_no_view: 180 };

// ─── Standard Offers (6 tiers × 6 cities = 36 rows) ───
const standard = [
  ...makeTier("عرض 1", TBILISI_T1, null),
  ...makeTier("عرض 2", TBILISI_T2, null),
  ...makeTier("عرض 3", TBILISI_T3, GUDAURI_T3),
  ...makeTier("عرض 4", TBILISI_T1, null),       // Same as Tier 1
  ...makeTier("عرض 5", TBILISI_T2, null),       // Same as Tier 2
  ...makeTier("عرض 6", TBILISI_T3, GUDAURI_T3), // Same as Tier 3
];

// ─── Honeymoon Offers (6 tiers × 6 cities = 36 rows, DBL_view only) ───
function honey(category, hotels) {
  return hotels.map(h => ({
    city: h[0], hotel_name: h[1], dbl_view: h[2],
    trbl_view: 0, dbl_no_view: 0, trbl_no_view: 0,
    category, is_active: true,
  }));
}

const honeymoon = [
  ...honey("هنيمون 1", [
    ["Tbilisi", "radisson red 5*", 155], ["Bakuriani", "crystal valla 5*", 90],
    ["Borjomi", "Borjomi Likani 5*", 180], ["Batumi", "batumi luxury view", 135],
    ["Dashbash", "Diamond Resort 5*", 120], ["Gudauri", "Monte Hotel", 175],
  ]),
  ...honey("هنيمون 2", [
    ["Tbilisi", "radisson red 5*", 155], ["Bakuriani", "Bakuriani inn 5*", 65],
    ["Borjomi", "Borjomi Likani 5*", 180], ["Batumi", "Best Western Premier", 155],
    ["Dashbash", "Diamond Resort 5*", 120], ["Gudauri", "Monte", 175],
  ]),
  ...honey("هنيمون 3", [
    ["Tbilisi", "Biltmore or pullman", 215], ["Bakuriani", "crystal hotel 5*", 115],
    ["Borjomi", "Crowne Plaza Borjomi 5*", 245], ["Batumi", "HILTON BATUMI", 260],
    ["Dashbash", "Diamond Resort 5*", 120], ["Gudauri", "Guadauri lodge 5*", 100],
  ]),
  ...honey("هنيمون 4", [
    ["Tbilisi", "Gallery Palace", 60], ["Bakuriani", "bakurini inn 5*", 85],
    ["Borjomi", "borjomi Palace", 180], ["Batumi", "New Wave Hotel", 105],
    ["Dashbash", "Diamond Resort 5*", 120], ["Gudauri", "Gudauri inn", 75],
  ]),
  ...honey("هنيمون 5", [
    ["Tbilisi", "Marjan Plaza hotel", 95], ["Bakuriani", "Bakuriani inn 5*", 85],
    ["Borjomi", "borjomi Palace", 180], ["Batumi", "Alliance Palace", 120],
    ["Dashbash", "Diamond Resort 5*", 115], ["Gudauri", "Gudauri inn", 75],
  ]),
  ...honey("هنيمون 6", [
    ["Tbilisi", "كوخ في تبليسي", 230], ["Bakuriani", "كوخ في باكورياني", 230],
    ["Borjomi", "كوخ في بورجومي", 230], ["Batumi", "كوخ في باتومي", 450],
    ["Kutaisi", "كوخ في كوتايسي", 230], ["Gudauri", "كوخ في غوداوري", 230],
  ]),
];

const allHotels = [...standard, ...honeymoon];

async function main() {
  console.log(`\n🗑️  Deleting all existing hotel_offers...`);
  const delRes = await fetch(`${SUPABASE_URL}/rest/v1/hotel_offers?id=gt.0`, { method: "DELETE", headers: HEADERS });
  console.log(`   DELETE status: ${delRes.status}`);

  console.log(`\n📥 Inserting ${allHotels.length} rows (${standard.length} standard + ${honeymoon.length} honeymoon)...`);
  const insRes = await fetch(`${SUPABASE_URL}/rest/v1/hotel_offers`, {
    method: "POST", headers: HEADERS, body: JSON.stringify(allHotels),
  });
  console.log(`   INSERT status: ${insRes.status}`);
  if (!insRes.ok) { const t = await insRes.text(); console.error("   Error:", t); }

  // Verify
  const verRes = await fetch(`${SUPABASE_URL}/rest/v1/hotel_offers?select=category&order=category`, { headers: HEADERS });
  const verData = await verRes.json();
  const cats = {};
  for (const r of verData) cats[r.category] = (cats[r.category] || 0) + 1;
  console.log(`\n✅ Verification — ${verData.length} total rows:`);
  for (const [cat, count] of Object.entries(cats)) console.log(`   ${cat}: ${count} hotels`);

  // ─── Create cached_quotes table via RPC (attempt) ───
  console.log(`\n📦 Attempting to create cached_quotes table...`);
  // Try inserting a dummy row — if table exists this works, if not we get 404
  const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/cached_quotes?select=hash_key&limit=1`, { headers: HEADERS });
  if (checkRes.status === 200) {
    console.log(`   ✅ cached_quotes table already exists`);
  } else {
    console.log(`   ⚠️  Table does not exist (status ${checkRes.status}). Create it manually in Supabase Dashboard:`);
    console.log(`
   SQL to run in Supabase Dashboard → SQL Editor:
   ──────────────────────────────────────────────
   CREATE TABLE IF NOT EXISTS cached_quotes (
     hash_key TEXT PRIMARY KEY,
     mobile_file_id TEXT,
     desktop_file_id TEXT,
     vip_file_id TEXT,
     honey_file_id TEXT,
     quote_text TEXT,
     created_at TIMESTAMPTZ DEFAULT now()
   );
   `);
  }

  console.log("\n🎉 Seeding complete!");
}

main().catch(console.error);
