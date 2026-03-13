/**
 * ============================================================================
 * LUXURY WORLD (عالم الفخامة) - Admin Panel Bot v2.0.0
 * ============================================================================
 *
 * PURPOSE:
 *   Database management interface (Admin Panel) for the Quotation Bot.
 *   Deployed as a separate Supabase Edge Function, listening to a private
 *   Telegram admin group only. Parses specific Arabic text templates to
 *   perform CRUD operations on hotel_offers and car_pricing tables.
 *
 * BOT: @hotelcarbot (Token: 8475559209:...)
 * ACCESS: Strictly restricted to ADMIN_GROUP_ID = -1003763141210
 *
 * SECURITY LOCK:
 *   Every incoming message and callback query is checked against the
 *   hardcoded ADMIN_GROUP_ID. If msg.chat.id !== ADMIN_GROUP_ID, the bot
 *   silently ignores the message and returns immediately.
 *
 * DB TABLES MANAGED (v2.0.0 schema — category-based pool):
 *   hotel_offers: id (int), category (text: اقتصادي|ستاندرد|متوسط|ديلوكس|فاخر),
 *     city (text), hotel_name (text), dbl_view (numeric), dbl_no_view (numeric),
 *     trbl_view (numeric), trbl_no_view (numeric), is_active (bool),
 *     created_at (timestamptz)
 *   car_pricing: id (int), min_pax (int), max_pax (int),
 *     price_per_day (numeric), car_type (text), is_active (bool),
 *     created_at (timestamptz)
 *
 * CHANGELOG v2.0.0 (March 7, 2026):
 *   DYNAMIC SMART HOTEL RECOMMENDATION ENGINE — Category-based Pool.
 *   1. DB schema pivot: offer_tier (tier_1..tier_5) → category (Arabic text).
 *   2. Hotels are now a global inventory pool: multiple hotels per city+category.
 *   3. Admin template: "العرض" replaced with "التصنيف" (category selector).
 *   4. Valid categories: اقتصادي, ستاندرد, متوسط, ديلوكس, فاخر.
 *   5. CRUD operations updated: add/update/delete by hotel_name+city+category.
 *   6. List view groups by category with Arabic labels.
 *   7. Smart Engine in quotation bot dynamically picks best hotel per city per
 *      category, constructing 5 tier offers on-the-fly.
 *
 * CHANGELOG v1.1.0 (March 7, 2026):
 *   Security enforcement & schema alignment release.
 *
 * CHANGELOG v1.0.0 (March 7, 2026):
 *   Initial release — Admin Panel Bot for @hotelcarbot.
 *
 * Update Date: 2026-03-07
 * ============================================================================
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ======================== CONFIGURATION ========================

const ADMIN_BOT_TOKEN = "8475559209:AAELMJ3i-dQ0Bmp9l2UNRLsaGOR9yCJkUCs";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://ouhteboiqitdgsmbqgyj.supabase.co";
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_GROUP_ID: number = Number(Deno.env.get("ADMIN_GROUP_ID")) || -1003763141210;

// ======================== CITY MAPPING ========================

const CITIES: Record<string, string> = {
  "تبليسي": "Tbilisi", "باتومي": "Batumi", "غوداوري": "Gudauri",
  "بورجومي": "Borjomi", "باكورياني": "Bakuriani", "كوتايسي": "Kutaisi",
  "داشباش": "Dashbash",
};
const CITIES_REV: Record<string, string> = {};
for (const [ar, en] of Object.entries(CITIES)) CITIES_REV[en.toLowerCase()] = ar;

function cityToDb(input: string): string | null {
  const t = input.trim();
  if (CITIES[t]) return CITIES[t];
  for (const [, en] of Object.entries(CITIES)) {
    if (en.toLowerCase() === t.toLowerCase()) return en;
  }
  return null;
}
function cityToAr(dbName: string): string {
  return CITIES_REV[dbName.toLowerCase()] || dbName;
}
const VALID_CITIES_AR = Object.keys(CITIES).join("، ");

// ======================== CATEGORY MAPPING ========================

const CATEGORIES = ["اقتصادي", "ستاندرد", "متوسط", "ديلوكس", "فاخر"];
const CATEGORY_ICONS = ["🥉", "🥈", "🥇", "💎", "👑"];
const VALID_CATEGORIES_AR = CATEGORIES.join("، ");

function isValidCategory(cat: string): boolean {
  return CATEGORIES.includes(cat.trim());
}

// ======================== TELEGRAM API ========================

async function tgSend(chatId: number, text: string, reply_markup?: any) {
  await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", reply_markup }),
  });
}
async function tgAnswer(callbackId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  });
}

// ======================== TEMPLATE DETECTION ========================

function isHotelTemplate(text: string): boolean {
  return /اسم\s*الفندق/.test(text) && /التصنيف\s*[:：]/.test(text);
}
function isCarTemplate(text: string): boolean {
  return /نوع\s*السيارة/.test(text) && /(?:السعة|السعر)/.test(text);
}

// ======================== HOTEL PARSER ========================

interface HotelParsed {
  action: "add" | "update" | "delete";
  hotelName: string;
  cityAr: string;
  cityDb: string;
  category: string;
  dblView?: number;
  trblView?: number;
  dblNoView?: number;
  trblNoView?: number;
}

function parseHotelTemplate(text: string): HotelParsed | string {
  const actionMatch = text.match(/(اضافة|إضافة|تحديث|تعديل|حذف)/);
  if (!actionMatch) return "❌ لم يتم العثور على نوع العملية (اضافة / تحديث / حذف)";

  const actionMap: Record<string, "add" | "update" | "delete"> = {
    "اضافة": "add", "إضافة": "add", "تحديث": "update", "تعديل": "update", "حذف": "delete",
  };
  const action = actionMap[actionMatch[1]];

  const hotelName = text.match(/اسم\s*الفندق\s*[:：]\s*(.+)/)?.[1]?.trim();
  if (!hotelName) return "❌ لم يتم العثور على اسم الفندق";

  const cityInput = text.match(/المدينة\s*[:：]\s*(.+)/)?.[1]?.trim();
  if (!cityInput) return "❌ لم يتم العثور على المدينة";
  const cityDb = cityToDb(cityInput);
  if (!cityDb) return `❌ المدينة "${cityInput}" غير موجودة\n\nالمدن المتاحة: ${VALID_CITIES_AR}`;

  const categoryInput = text.match(/التصنيف\s*[:：]\s*(.+)/)?.[1]?.trim();
  if (!categoryInput) return "❌ لم يتم العثور على التصنيف";
  if (!isValidCategory(categoryInput)) {
    return `❌ التصنيف "${categoryInput}" غير صحيح\n\nالتصنيفات المتاحة: ${VALID_CATEGORIES_AR}`;
  }

  if (action === "delete") {
    return { action, hotelName, cityAr: cityInput, cityDb, category: categoryInput.trim() };
  }

  // Line-by-line parsing for prices
  const lines = text.split(/\n/);
  let inViewSection = false;
  let inNoViewSection = false;
  let dblView: number | undefined;
  let trblView: number | undefined;
  let dblNoView: number | undefined;
  let trblNoView: number | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/سعر\s*(?:الإطلالة|إطلالة|الاطلالة|اطلالة)\s*[:：]?/.test(trimmed)) {
      inViewSection = true; inNoViewSection = false; continue;
    }
    if (/سعر\s*بدون\s*(?:إطلالة|الإطلالة|اطلالة|الاطلالة)\s*[:：]?/.test(trimmed)) {
      inViewSection = false; inNoViewSection = true; continue;
    }
    const priceMatch = trimmed.match(/[:：]\s*(\d+)/);
    if (!priceMatch) continue;
    const price = parseInt(priceMatch[1], 10);

    if (/(?:المفردة|المفرده)/.test(trimmed)) {
      if (inViewSection) dblView = price;
      else if (inNoViewSection) dblNoView = price;
    } else if (/الثلاثية/.test(trimmed)) {
      if (inViewSection) trblView = price;
      else if (inNoViewSection) trblNoView = price;
    }
  }

  if (dblView === undefined || trblView === undefined || dblNoView === undefined || trblNoView === undefined) {
    return "❌ لم يتم العثور على جميع الأسعار\n\nالمطلوب: 4 أسعار\n• سعر الإطلالة: المفردة/المزدوجة + الثلاثية\n• سعر بدون إطلالة: المفردة/المزدوجة + الثلاثية";
  }

  return {
    action, hotelName, cityAr: cityInput, cityDb, category: categoryInput.trim(),
    dblView, trblView, dblNoView, trblNoView,
  };
}

// ======================== CAR PARSER ========================

interface CarParsed {
  action: "add" | "update" | "delete";
  carType: string;
  price?: number;
  minPax?: number;
  maxPax?: number;
}

function parseCarTemplate(text: string): CarParsed | string {
  const actionMatch = text.match(/(اضافة|إضافة|تعديل|تحديث|حذف)/);
  if (!actionMatch) return "❌ لم يتم العثور على نوع العملية";

  const actionMap: Record<string, "add" | "update" | "delete"> = {
    "اضافة": "add", "إضافة": "add", "تعديل": "update", "تحديث": "update", "حذف": "delete",
  };
  const action = actionMap[actionMatch[1]];

  const carType = text.match(/نوع\s*السيارة\s*[:：]\s*(.+)/)?.[1]?.trim();
  if (!carType) return "❌ لم يتم العثور على نوع السيارة";

  if (action === "delete") return { action, carType };

  const priceStr = text.match(/السعر\s*(?:في\s*)?(?:اليوم\s*)?(?:الواحد\s*)?[:：]\s*(\d+)/)?.[1];
  if (!priceStr) return "❌ لم يتم العثور على السعر";

  const capacityStr = text.match(/السعة\s*[:：]\s*(.+)/)?.[1]?.trim();
  if (!capacityStr) return "❌ لم يتم العثور على السعة";

  let minPax: number, maxPax: number;
  const rangeMatch = capacityStr.match(/(\d+)\s*[-–—]\s*(\d+)/);
  if (rangeMatch) {
    minPax = parseInt(rangeMatch[1], 10);
    maxPax = parseInt(rangeMatch[2], 10);
  } else {
    const singleMatch = capacityStr.match(/(\d+)/);
    if (!singleMatch) return "❌ تنسيق السعة غير صحيح (مثال: 1-3 أو 4-6)";
    minPax = maxPax = parseInt(singleMatch[1], 10);
  }
  return { action, carType, price: parseInt(priceStr, 10), minPax, maxPax };
}

// ======================== HOTEL CRUD ========================

async function handleHotelCRUD(chatId: number, p: HotelParsed) {
  const catIdx = CATEGORIES.indexOf(p.category);
  const catIcon = CATEGORY_ICONS[catIdx] || "🏨";

  if (p.action === "add") {
    // Check for exact duplicate (same name + city + category)
    const { data: existing } = await supabase
      .from("hotel_offers").select("id, is_active")
      .eq("hotel_name", p.hotelName).eq("city", p.cityDb).eq("category", p.category)
      .maybeSingle();

    if (existing && existing.is_active) {
      await tgSend(chatId, `⚠️ الفندق <b>${p.hotelName}</b> موجود بالفعل في ${p.cityAr} (${p.category})\n\nاستخدم "تحديث" لتعديل البيانات.`);
      return;
    }

    if (existing && !existing.is_active) {
      const { error } = await supabase.from("hotel_offers").update({
        hotel_name: p.hotelName, dbl_view: p.dblView, dbl_no_view: p.dblNoView,
        trbl_view: p.trblView, trbl_no_view: p.trblNoView, is_active: true,
      }).eq("id", existing.id);
      if (error) { await tgSend(chatId, `❌ خطأ: ${error.message}`); return; }
    } else {
      const { error } = await supabase.from("hotel_offers").insert({
        category: p.category, city: p.cityDb, hotel_name: p.hotelName,
        dbl_view: p.dblView, dbl_no_view: p.dblNoView,
        trbl_view: p.trblView, trbl_no_view: p.trblNoView,
      });
      if (error) { await tgSend(chatId, `❌ خطأ: ${error.message}`); return; }
    }

    await tgSend(chatId,
      `✅ تم اضافة الفندق <b>${p.hotelName}</b> بنجاح!\n\n${catIcon} التصنيف: ${p.category}\n📍 المدينة: ${p.cityAr}\n💰 إطلالة: مزدوجة $${p.dblView} | ثلاثية $${p.trblView}\n💰 بدون: مزدوجة $${p.dblNoView} | ثلاثية $${p.trblNoView}`);

  } else if (p.action === "update") {
    const { data: existing } = await supabase
      .from("hotel_offers").select("id")
      .eq("hotel_name", p.hotelName).eq("city", p.cityDb).eq("category", p.category)
      .eq("is_active", true).maybeSingle();

    if (!existing) {
      await tgSend(chatId, `⚠️ لم يتم العثور على فندق <b>${p.hotelName}</b> في ${p.cityAr} (${p.category})\n\nاستخدم "اضافة" لإضافة فندق جديد.`);
      return;
    }

    const { error } = await supabase.from("hotel_offers").update({
      dbl_view: p.dblView, dbl_no_view: p.dblNoView,
      trbl_view: p.trblView, trbl_no_view: p.trblNoView,
    }).eq("id", existing.id);
    if (error) { await tgSend(chatId, `❌ خطأ: ${error.message}`); return; }

    await tgSend(chatId,
      `✅ تم تحديث الفندق <b>${p.hotelName}</b> بنجاح!\n\n${catIcon} التصنيف: ${p.category}\n📍 المدينة: ${p.cityAr}\n💰 إطلالة: مزدوجة $${p.dblView} | ثلاثية $${p.trblView}\n💰 بدون: مزدوجة $${p.dblNoView} | ثلاثية $${p.trblNoView}`);

  } else if (p.action === "delete") {
    const { data: existing } = await supabase
      .from("hotel_offers").select("id, hotel_name")
      .eq("hotel_name", p.hotelName).eq("city", p.cityDb).eq("category", p.category)
      .eq("is_active", true).maybeSingle();

    if (!existing) {
      await tgSend(chatId, `⚠️ لم يتم العثور على فندق <b>${p.hotelName}</b> نشط في ${p.cityAr} (${p.category})`);
      return;
    }

    const { error } = await supabase.from("hotel_offers").update({ is_active: false }).eq("id", existing.id);
    if (error) { await tgSend(chatId, `❌ خطأ: ${error.message}`); return; }

    await tgSend(chatId, `✅ تم حذف الفندق <b>${existing.hotel_name}</b> (${p.category}) من ${p.cityAr} بنجاح!`);
  }
}

// ======================== CAR CRUD ========================

async function handleCarCRUD(chatId: number, parsed: CarParsed) {
  if (parsed.action === "add") {
    const { error } = await supabase.from("car_pricing").insert({
      min_pax: parsed.minPax, max_pax: parsed.maxPax,
      price_per_day: parsed.price, car_type: parsed.carType, is_active: true,
    });
    if (error) {
      if (error.code === "23505") {
        await tgSend(chatId, `⚠️ يوجد سعر بنفس نطاق السعة (${parsed.minPax}-${parsed.maxPax}) بالفعل\n\nاستخدم "تعديل" لتحديث السعر.`);
      } else { await tgSend(chatId, `❌ خطأ: ${error.message}`); }
      return;
    }
    await tgSend(chatId, `✅ تم اضافة سيارة <b>${parsed.carType}</b> ($${parsed.price}/يوم، سعة ${parsed.minPax}-${parsed.maxPax}) بنجاح!`);

  } else if (parsed.action === "update") {
    let targetId: number | null = null;
    const { data: byName } = await supabase.from("car_pricing").select("id")
      .eq("car_type", parsed.carType).eq("is_active", true).maybeSingle();
    if (byName) { targetId = byName.id; }
    else if (parsed.minPax !== undefined && parsed.maxPax !== undefined) {
      const { data: byPax } = await supabase.from("car_pricing").select("id")
        .eq("min_pax", parsed.minPax).eq("max_pax", parsed.maxPax)
        .eq("is_active", true).maybeSingle();
      if (byPax) targetId = byPax.id;
    }
    if (!targetId) {
      await tgSend(chatId, `⚠️ لم يتم العثور على سيارة "${parsed.carType}"\n\nاستخدم "اضافة" لإضافة نوع جديد.`);
      return;
    }
    const updateData: Record<string, unknown> = { price_per_day: parsed.price, car_type: parsed.carType };
    if (parsed.minPax !== undefined) updateData.min_pax = parsed.minPax;
    if (parsed.maxPax !== undefined) updateData.max_pax = parsed.maxPax;
    const { error } = await supabase.from("car_pricing").update(updateData).eq("id", targetId);
    if (error) { await tgSend(chatId, `❌ خطأ: ${error.message}`); return; }
    await tgSend(chatId, `✅ تم تعديل سيارة <b>${parsed.carType}</b> ($${parsed.price}/يوم، سعة ${parsed.minPax}-${parsed.maxPax}) بنجاح!`);

  } else if (parsed.action === "delete") {
    const { data: existing } = await supabase.from("car_pricing").select("id, car_type")
      .eq("car_type", parsed.carType).eq("is_active", true).maybeSingle();
    if (!existing) { await tgSend(chatId, `⚠️ لم يتم العثور على سيارة "${parsed.carType}" نشطة`); return; }
    const { error } = await supabase.from("car_pricing").update({ is_active: false }).eq("id", existing.id);
    if (error) { await tgSend(chatId, `❌ خطأ: ${error.message}`); return; }
    await tgSend(chatId, `✅ تم حذف سيارة <b>${existing.car_type}</b> بنجاح!`);
  }
}

// ======================== LIST OPERATIONS ========================

async function listHotels(chatId: number) {
  const { data, error } = await supabase
    .from("hotel_offers").select("*")
    .eq("is_active", true)
    .order("category").order("city");

  if (error || !data?.length) {
    await tgSend(chatId, "📊 لا توجد فنادق نشطة في قاعدة البيانات");
    return;
  }

  // Group by category
  const grouped: Record<string, typeof data> = {};
  for (const h of data) {
    if (!grouped[h.category]) grouped[h.category] = [];
    grouped[h.category].push(h);
  }

  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i];
    const hotels = grouped[cat];
    if (!hotels?.length) continue;

    let chunk = `${CATEGORY_ICONS[i]} <b>${cat}:</b>\n\n`;
    for (const h of hotels) {
      chunk += `🏨 <b>${h.hotel_name}</b> — ${cityToAr(h.city)}\n`;
      chunk += `  إطلالة: مزدوجة $${h.dbl_view} | ثلاثية $${h.trbl_view}\n`;
      chunk += `  بدون: مزدوجة $${h.dbl_no_view} | ثلاثية $${h.trbl_no_view}\n\n`;
    }
    await tgSend(chatId, chunk);
  }
}

async function listCars(chatId: number) {
  const { data, error } = await supabase
    .from("car_pricing").select("*").eq("is_active", true).order("min_pax");
  if (error || !data?.length) {
    await tgSend(chatId, "🚗 لا توجد سيارات نشطة في قاعدة البيانات");
    return;
  }
  let msg = "🚗 <b>أسعار السيارات:</b>\n\n";
  for (const c of data) {
    msg += `• <b>${c.car_type}</b>\n  السعر: $${c.price_per_day}/يوم | السعة: ${c.min_pax}-${c.max_pax} ركاب\n\n`;
  }
  await tgSend(chatId, msg);
}

// ======================== TEMPLATE MESSAGES ========================

const HOTEL_TEMPLATES: Record<string, string> = {
  add: `📝 <b>نموذج إضافة فندق</b>\nانسخ وعدّل ثم أرسل:\n\n<code>اضافة\n\nاسم الفندق : \nالمدينة : \nالتصنيف : \nسعر الإطلالة :\nالمفردة و المزدوجة: \nالثلاثية : \n\nسعر بدون إطلالة :\nالمفردة او المزدوجة : \nالثلاثية : </code>\n\n📌 المدن: ${VALID_CITIES_AR}\n📌 التصنيف: ${VALID_CATEGORIES_AR}`,
  update: `📝 <b>نموذج تحديث فندق</b>\nانسخ وعدّل ثم أرسل:\n\n<code>تحديث\n\nاسم الفندق : \nالمدينة : \nالتصنيف : \nسعر الإطلالة :\nالمفردة و المزدوجة: \nالثلاثية : \n\nسعر بدون إطلالة :\nالمفردة او المزدوجة : \nالثلاثية : </code>`,
  delete: `📝 <b>نموذج حذف فندق</b>\nانسخ وعدّل ثم أرسل:\n\n<code>حذف\n\nاسم الفندق : \nالمدينة : \nالتصنيف : </code>`,
};

const CAR_TEMPLATES: Record<string, string> = {
  add: `📝 <b>نموذج إضافة سيارة</b>\nانسخ وعدّل ثم أرسل:\n\n<code>اضافة\n\nنوع السيارة : \nالسعر في اليوم الواحد : \nالسعة : </code>\n\n📌 السعة: مثال 1-3 أو 4-6`,
  update: `📝 <b>نموذج تعديل سيارة</b>\nانسخ وعدّل ثم أرسل:\n\n<code>تعديل\n\nنوع السيارة : \nالسعر في اليوم الواحد : \nالسعة : </code>`,
  delete: `📝 <b>نموذج حذف سيارة</b>\nانسخ وعدّل ثم أرسل:\n\n<code>حذف\n\nنوع السيارة : </code>`,
};

// ======================== MAIN HANDLER ========================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("OK", { headers: corsHeaders });

  try {
    const update = await req.json();
    const msg = update.message;
    const cb = update.callback_query;

    // ── CALLBACK QUERY HANDLING ──
    if (cb) {
      const chatId = cb.message?.chat?.id;
      const cbData = cb.data;
      if (!chatId) return new Response("OK", { headers: corsHeaders });
      if (chatId !== ADMIN_GROUP_ID) return new Response("OK", { headers: corsHeaders });

      await tgAnswer(cb.id, "");

      if (cbData === "adm_hotels") {
        await tgSend(chatId, "🏨 <b>إدارة الفنادق</b>\n\nاختر العملية:", { inline_keyboard: [
          [{ text: "➕ إضافة فندق", callback_data: "adm_h_add" }, { text: "✏️ تحديث فندق", callback_data: "adm_h_update" }],
          [{ text: "🗑️ حذف فندق", callback_data: "adm_h_delete" }, { text: "📋 عرض الكل", callback_data: "adm_h_list" }],
          [{ text: "🔙 رجوع", callback_data: "adm_main" }],
        ]});
      }
      else if (cbData === "adm_cars") {
        await tgSend(chatId, "🚗 <b>إدارة السيارات</b>\n\nاختر العملية:", { inline_keyboard: [
          [{ text: "➕ إضافة سيارة", callback_data: "adm_c_add" }, { text: "✏️ تعديل سيارة", callback_data: "adm_c_update" }],
          [{ text: "🗑️ حذف سيارة", callback_data: "adm_c_delete" }, { text: "📋 عرض الكل", callback_data: "adm_c_list" }],
          [{ text: "🔙 رجوع", callback_data: "adm_main" }],
        ]});
      }
      else if (cbData === "adm_main") {
        await tgSend(chatId, "⚙️ <b>لوحة التحكم — عالم الفخامة</b>\n\nاختر القسم:", { inline_keyboard: [
          [{ text: "🏨 إدارة الفنادق", callback_data: "adm_hotels" }, { text: "🚗 إدارة السيارات", callback_data: "adm_cars" }],
        ]});
      }
      else if (cbData === "adm_h_add") { await tgSend(chatId, HOTEL_TEMPLATES.add); }
      else if (cbData === "adm_h_update") { await tgSend(chatId, HOTEL_TEMPLATES.update); }
      else if (cbData === "adm_h_delete") { await tgSend(chatId, HOTEL_TEMPLATES.delete); }
      else if (cbData === "adm_h_list") { await listHotels(chatId); }
      else if (cbData === "adm_c_add") { await tgSend(chatId, CAR_TEMPLATES.add); }
      else if (cbData === "adm_c_update") { await tgSend(chatId, CAR_TEMPLATES.update); }
      else if (cbData === "adm_c_delete") { await tgSend(chatId, CAR_TEMPLATES.delete); }
      else if (cbData === "adm_c_list") { await listCars(chatId); }

      return new Response("OK", { headers: corsHeaders });
    }

    // ── MESSAGE HANDLING ──
    if (!msg?.text) return new Response("OK", { headers: corsHeaders });
    const chatId: number = msg.chat.id;
    const text: string = msg.text.trim();

    // ── STRICT SECURITY ──
    if (chatId !== ADMIN_GROUP_ID) return new Response("OK", { headers: corsHeaders });

    // ── Commands ──
    if (text === "/admin" || text === "/start" || text === "/admin@hotelcarbot" || text === "/start@hotelcarbot") {
      await tgSend(chatId, "⚙️ <b>لوحة التحكم — عالم الفخامة</b>\n\nاختر القسم:", { inline_keyboard: [
        [{ text: "🏨 إدارة الفنادق", callback_data: "adm_hotels" }, { text: "🚗 إدارة السيارات", callback_data: "adm_cars" }],
      ]});
      return new Response("OK", { headers: corsHeaders });
    }

    // ── Hotel Template Parser ──
    if (isHotelTemplate(text)) {
      const result = parseHotelTemplate(text);
      if (typeof result === "string") await tgSend(chatId, result);
      else await handleHotelCRUD(chatId, result);
      return new Response("OK", { headers: corsHeaders });
    }

    // ── Car Template Parser ──
    if (isCarTemplate(text)) {
      const result = parseCarTemplate(text);
      if (typeof result === "string") await tgSend(chatId, result);
      else await handleCarCRUD(chatId, result);
      return new Response("OK", { headers: corsHeaders });
    }

    // ── Fallback ──
    if (/(اضافة|إضافة|تحديث|تعديل|حذف|فندق|سيارة|admin|ادمن)/.test(text)) {
      await tgSend(chatId,
        "⚠️ لم أتمكن من تحليل الرسالة.\n\nاستخدم /admin لعرض لوحة التحكم والنماذج الجاهزة.", { inline_keyboard: [
          [{ text: "🏨 إدارة الفنادق", callback_data: "adm_hotels" }, { text: "🚗 إدارة السيارات", callback_data: "adm_cars" }],
        ]});
    }

    return new Response("OK", { headers: corsHeaders });
  } catch (err) {
    console.error("[ADMIN BOT v2.0.0] Error:", err);
    return new Response("OK", { headers: corsHeaders });
  }
});
