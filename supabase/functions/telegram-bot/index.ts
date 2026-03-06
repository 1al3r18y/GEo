/**
 * ============================================================================
 * LUXURY WORLD (عالم الفخامة) - Telegram Bot Interactive FSM Wizard v3.2.0
 * ============================================================================
 * 
 * COMPLETE FSM WORKFLOW WITH DYNAMIC CITY/NIGHTS DISTRIBUTION:
 * 
 * State 1 (START): /start → Welcome + [إنشاء عرض سعر جديد]
 * State 2 (AWAITING_DAYS): Bot asks for trip days
 * State 3 (AWAITING_AIRPORT): Airport selection (TBS/BUS/KUT)
 * State 4 (AWAITING_CITIES): Toggle city selection - ask_cities()
 * State 5 (AWAITING_NIGHTS): Sequential nights per city - ask_nights_for_city()
 * State 6 (NIGHTS_SUMMARY): Validation & summary - show_nights_summary()
 * State 7 (AWAITING_VIEW): View preference (with/without view)
 * State 8 (AWAITING_ADULTS): Number of adults
 * State 9 (AWAITING_CHILDREN_CHECK): Yes/No children
 * State 10 (AWAITING_CHILD_AGES): Child ages input
 * State 11 (PROCESSING): Generate quote
 * 
 * FUNCTIONS:
 * - ask_cities(): Toggle city selection with inline keyboard
 * - ask_nights_for_city(): Sequential nights distribution per city
 * - show_nights_summary(): Validation and summary with mismatch handling
 * - handle_callback(): Central callback processor
 * 
 * @version 3.2.0
 * @date March 6, 2026
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// FSM STATES
// ============================================================================

type BotState = 
  | "IDLE"
  | "AWAITING_DAYS"
  | "AWAITING_AIRPORT"
  | "AWAITING_CITIES"
  | "AWAITING_NIGHTS"
  | "NIGHTS_SUMMARY"
  | "AWAITING_VIEW"
  | "AWAITING_ADULTS"
  | "AWAITING_CHILDREN_CHECK"
  | "AWAITING_CHILD_AGES"
  | "PROCESSING";

interface CityNights {
  city: string;
  nights: number;
}

interface SessionData {
  days?: number;
  totalNights?: number;
  airport?: string;
  airportName?: string;
  selectedCities?: string[];           // Cities selected in ask_cities
  cityNights?: CityNights[];           // City-nights distribution
  currentCityIndex?: number;           // Current city being configured
  viewPreference?: "view" | "no_view";
  adults?: number;
  hasChildren?: boolean;
  childAges?: number[];
  childrenOver6?: number;
  childrenUnder6?: number;
  effectivePax?: number;
}

interface Session {
  chat_id: number;
  state: BotState;
  data: SessionData;
}

// ============================================================================
// AVAILABLE CITIES
// ============================================================================

const CITIES = [
  { id: "Tbilisi", nameAr: "تبليسي", emoji: "🏛️" },
  { id: "Batumi", nameAr: "باتومي", emoji: "🏖️" },
  { id: "Gudauri", nameAr: "غوداوري", emoji: "⛷️" },
  { id: "Borjomi", nameAr: "بورجومي", emoji: "🌲" },
  { id: "Bakuriani", nameAr: "باكورياني", emoji: "🎿" },
  { id: "Kutaisi", nameAr: "كوتايسي", emoji: "🏰" },
  { id: "Dashbash", nameAr: "داشباش", emoji: "🏞️" },
];

const AIRPORTS = [
  { id: "TBS", nameAr: "مطار تبليسي", city: "Tbilisi" },
  { id: "BUS", nameAr: "مطار باتومي", city: "Batumi" },
  { id: "KUT", nameAr: "مطار كوتايسي", city: "Kutaisi" },
];

// ============================================================================
// SMART ROOM ALLOCATION ENGINE
// ============================================================================

interface RoomAllocation {
  singleRooms: number;
  doubleRooms: number;
  tripleRooms: number;
  totalRooms: number;
  effectivePax: number;
}

function allocateRooms(effectivePax: number): RoomAllocation {
  if (effectivePax <= 0) {
    return { singleRooms: 0, doubleRooms: 0, tripleRooms: 0, totalRooms: 0, effectivePax: 0 };
  }

  const strictMapping: Record<number, RoomAllocation> = {
    1: { singleRooms: 1, doubleRooms: 0, tripleRooms: 0, totalRooms: 1, effectivePax: 1 },
    2: { singleRooms: 0, doubleRooms: 1, tripleRooms: 0, totalRooms: 1, effectivePax: 2 },
    3: { singleRooms: 0, doubleRooms: 0, tripleRooms: 1, totalRooms: 1, effectivePax: 3 },
    4: { singleRooms: 0, doubleRooms: 2, tripleRooms: 0, totalRooms: 2, effectivePax: 4 },
    5: { singleRooms: 0, doubleRooms: 1, tripleRooms: 1, totalRooms: 2, effectivePax: 5 },
    6: { singleRooms: 0, doubleRooms: 0, tripleRooms: 2, totalRooms: 2, effectivePax: 6 },
  };

  if (effectivePax <= 6) return strictMapping[effectivePax];

  let tripleRooms = Math.floor(effectivePax / 3);
  const remaining = effectivePax % 3;
  let doubleRooms = 0;
  let singleRooms = 0;

  switch (remaining) {
    case 0: break;
    case 1:
      if (tripleRooms > 0) { tripleRooms--; doubleRooms = 2; }
      else { singleRooms = 1; }
      break;
    case 2: doubleRooms = 1; break;
  }

  return { singleRooms, doubleRooms, tripleRooms, totalRooms: singleRooms + doubleRooms + tripleRooms, effectivePax };
}

function calculateEffectivePax(adults: number, childAges: number[]): { effectivePax: number; childrenOver6: number; childrenUnder6: number } {
  let childrenOver6 = 0;
  let childrenUnder6 = 0;
  for (const age of childAges) {
    if (age > 6) childrenOver6++;
    else childrenUnder6++;
  }
  return { effectivePax: adults + childrenOver6, childrenOver6, childrenUnder6 };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();

    // ========================================================================
    // HANDLE TEXT MESSAGES
    // ========================================================================
    if (body.message) {
      const chatId = body.message.chat.id;
      const text = body.message.text?.trim() || "";
      let session = await getSession(supabase, chatId);

      // /start Command
      if (text === "/start") {
        await resetSession(supabase, chatId);
        await sendWelcomeMessage(TELEGRAM_BOT_TOKEN!, chatId);
        return new Response("OK", { headers: corsHeaders });
      }

      // AWAITING_DAYS
      if (session.state === "AWAITING_DAYS") {
        const days = parseInt(text);
        if (isNaN(days) || days < 1 || days > 30) {
          await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, "⚠️ يرجى إدخال رقم صحيح بين 1 و 30 يوماً.");
          return new Response("OK", { headers: corsHeaders });
        }
        session.data.days = days;
        session.data.totalNights = days;
        await updateSession(supabase, chatId, "AWAITING_AIRPORT", session.data);
        await sendAirportSelection(TELEGRAM_BOT_TOKEN!, chatId);
        return new Response("OK", { headers: corsHeaders });
      }

      // AWAITING_NIGHTS - User types number of nights
      if (session.state === "AWAITING_NIGHTS") {
        const nights = parseInt(text);
        if (isNaN(nights) || nights < 0 || nights > 30) {
          await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, "⚠️ يرجى إدخال رقم صحيح (0-30).");
          return new Response("OK", { headers: corsHeaders });
        }
        await handleNightsInput(supabase, TELEGRAM_BOT_TOKEN!, chatId, session, nights);
        return new Response("OK", { headers: corsHeaders });
      }

      // AWAITING_ADULTS
      if (session.state === "AWAITING_ADULTS") {
        const adults = parseInt(text);
        if (isNaN(adults) || adults < 1 || adults > 50) {
          await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, "⚠️ يرجى إدخال عدد صحيح للبالغين (1-50).");
          return new Response("OK", { headers: corsHeaders });
        }
        session.data.adults = adults;
        await updateSession(supabase, chatId, "AWAITING_CHILDREN_CHECK", session.data);
        await sendChildrenCheckPrompt(TELEGRAM_BOT_TOKEN!, chatId);
        return new Response("OK", { headers: corsHeaders });
      }

      // AWAITING_CHILD_AGES
      if (session.state === "AWAITING_CHILD_AGES") {
        const agesText = text.replace(/،/g, " ").replace(/,/g, " ");
        const ageStrings = agesText.split(/\s+/).filter(s => s.length > 0);
        const ages: number[] = [];
        for (const ageStr of ageStrings) {
          const age = parseInt(ageStr);
          if (isNaN(age) || age < 0 || age > 17) {
            await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, "⚠️ يرجى إدخال أعمار صحيحة (0-17) مفصولة بمسافة.\n\nمثال: 4 7 10");
            return new Response("OK", { headers: corsHeaders });
          }
          ages.push(age);
        }
        if (ages.length === 0) {
          await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, "⚠️ يرجى إدخال عمر واحد على الأقل.\n\nمثال: 4 7 10");
          return new Response("OK", { headers: corsHeaders });
        }
        session.data.childAges = ages;
        const { effectivePax, childrenOver6, childrenUnder6 } = calculateEffectivePax(session.data.adults!, ages);
        session.data.effectivePax = effectivePax;
        session.data.childrenOver6 = childrenOver6;
        session.data.childrenUnder6 = childrenUnder6;
        await updateSession(supabase, chatId, "PROCESSING", session.data);
        await processAndGenerateQuote(supabase, TELEGRAM_BOT_TOKEN!, chatId, session.data);
        return new Response("OK", { headers: corsHeaders });
      }

      await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, "أرسل /start لبدء إنشاء عرض سعر جديد.");
      return new Response("OK", { headers: corsHeaders });
    }

    // ========================================================================
    // HANDLE CALLBACK QUERIES - handle_callback()
    // ========================================================================
    if (body.callback_query) {
      const callback = body.callback_query;
      const chatId = callback.message.chat.id;
      const messageId = callback.message.message_id;
      const data = callback.data;
      let session = await getSession(supabase, chatId);

      // ------------------------------------------------------------------
      // NEW QUOTE BUTTON
      // ------------------------------------------------------------------
      if (data === "new_quote") {
        session = await resetSession(supabase, chatId);
        await updateSession(supabase, chatId, "AWAITING_DAYS", {});
        await sendDaysPrompt(TELEGRAM_BOT_TOKEN!, chatId);
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "");
        return new Response("OK", { headers: corsHeaders });
      }

      // ------------------------------------------------------------------
      // AIRPORT SELECTION
      // ------------------------------------------------------------------
      if (data.startsWith("airport_")) {
        const airportId = data.replace("airport_", "");
        const airport = AIRPORTS.find(a => a.id === airportId);
        if (airport) {
          session.data.airport = airport.id;
          session.data.airportName = airport.nameAr;
          session.data.selectedCities = [];
          await updateSession(supabase, chatId, "AWAITING_CITIES", session.data);
          await askCities(TELEGRAM_BOT_TOKEN!, chatId, session.data);
          await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, `✅ ${airport.nameAr}`);
        }
        return new Response("OK", { headers: corsHeaders });
      }

      // ------------------------------------------------------------------
      // CITY TOGGLE (city_*)
      // ------------------------------------------------------------------
      if (data.startsWith("city_")) {
        const cityId = data.replace("city_", "");
        const selectedCities = session.data.selectedCities || [];
        
        if (selectedCities.includes(cityId)) {
          session.data.selectedCities = selectedCities.filter(c => c !== cityId);
        } else {
          session.data.selectedCities = [...selectedCities, cityId];
        }
        
        await updateSession(supabase, chatId, "AWAITING_CITIES", session.data);
        await updateCitiesMessage(TELEGRAM_BOT_TOKEN!, chatId, messageId, session.data);
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "");
        return new Response("OK", { headers: corsHeaders });
      }

      // ------------------------------------------------------------------
      // CITIES DONE (cities_done) - Proceed to nights distribution
      // ------------------------------------------------------------------
      if (data === "cities_done") {
        const selectedCities = session.data.selectedCities || [];
        if (selectedCities.length === 0) {
          await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "⚠️ يرجى اختيار مدينة واحدة على الأقل");
          return new Response("OK", { headers: corsHeaders });
        }
        // Initialize cityNights array
        session.data.cityNights = selectedCities.map(city => ({ city, nights: 0 }));
        session.data.currentCityIndex = 0;
        await updateSession(supabase, chatId, "AWAITING_NIGHTS", session.data);
        await askNightsForCity(TELEGRAM_BOT_TOKEN!, chatId, session.data);
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "✅ تم اختيار المدن");
        return new Response("OK", { headers: corsHeaders });
      }

      // ------------------------------------------------------------------
      // NIGHTS QUICK BUTTONS (nights_*)
      // ------------------------------------------------------------------
      if (data.startsWith("nights_")) {
        const nights = parseInt(data.replace("nights_", ""));
        await handleNightsInput(supabase, TELEGRAM_BOT_TOKEN!, chatId, session, nights);
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "");
        return new Response("OK", { headers: corsHeaders });
      }

      // ------------------------------------------------------------------
      // PREVIOUS CITY (prev_city)
      // ------------------------------------------------------------------
      if (data === "prev_city") {
        const currentIndex = session.data.currentCityIndex || 0;
        if (currentIndex > 0) {
          session.data.currentCityIndex = currentIndex - 1;
          await updateSession(supabase, chatId, "AWAITING_NIGHTS", session.data);
          await askNightsForCity(TELEGRAM_BOT_TOKEN!, chatId, session.data);
        }
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "");
        return new Response("OK", { headers: corsHeaders });
      }

      // ------------------------------------------------------------------
      // EDIT CITIES (edit_cities) - Go back to city selection
      // ------------------------------------------------------------------
      if (data === "edit_cities") {
        session.data.cityNights = [];
        session.data.currentCityIndex = 0;
        await updateSession(supabase, chatId, "AWAITING_CITIES", session.data);
        await askCities(TELEGRAM_BOT_TOKEN!, chatId, session.data);
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "🔄 تعديل المدن");
        return new Response("OK", { headers: corsHeaders });
      }

      // ------------------------------------------------------------------
      // EDIT NIGHTS (edit_nights) - Restart nights distribution
      // ------------------------------------------------------------------
      if (data === "edit_nights") {
        const selectedCities = session.data.selectedCities || [];
        session.data.cityNights = selectedCities.map(city => ({ city, nights: 0 }));
        session.data.currentCityIndex = 0;
        await updateSession(supabase, chatId, "AWAITING_NIGHTS", session.data);
        await askNightsForCity(TELEGRAM_BOT_TOKEN!, chatId, session.data);
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "🔄 تعديل الليالي");
        return new Response("OK", { headers: corsHeaders });
      }

      // ------------------------------------------------------------------
      // VIEW PREFERENCE (view_*)
      // ------------------------------------------------------------------
      if (data === "view_with") {
        session.data.viewPreference = "view";
        await updateSession(supabase, chatId, "AWAITING_ADULTS", session.data);
        await sendAdultsPrompt(TELEGRAM_BOT_TOKEN!, chatId);
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "✅ مع إطلالة");
        return new Response("OK", { headers: corsHeaders });
      }
      if (data === "view_without") {
        session.data.viewPreference = "no_view";
        await updateSession(supabase, chatId, "AWAITING_ADULTS", session.data);
        await sendAdultsPrompt(TELEGRAM_BOT_TOKEN!, chatId);
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "✅ بدون إطلالة");
        return new Response("OK", { headers: corsHeaders });
      }

      // ------------------------------------------------------------------
      // CHILDREN CHECK (children_yes/no)
      // ------------------------------------------------------------------
      if (data === "children_yes") {
        session.data.hasChildren = true;
        await updateSession(supabase, chatId, "AWAITING_CHILD_AGES", session.data);
        await sendChildAgesPrompt(TELEGRAM_BOT_TOKEN!, chatId);
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "");
        return new Response("OK", { headers: corsHeaders });
      }
      if (data === "children_no") {
        session.data.hasChildren = false;
        session.data.childAges = [];
        session.data.childrenOver6 = 0;
        session.data.childrenUnder6 = 0;
        session.data.effectivePax = session.data.adults;
        await updateSession(supabase, chatId, "PROCESSING", session.data);
        await processAndGenerateQuote(supabase, TELEGRAM_BOT_TOKEN!, chatId, session.data);
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "");
        return new Response("OK", { headers: corsHeaders });
      }

      // ------------------------------------------------------------------
      // COPY / NEW QUOTE
      // ------------------------------------------------------------------
      if (data === "copy_quote") {
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "✅ قم بإعادة توجيه الرسالة للعميل");
        return new Response("OK", { headers: corsHeaders });
      }
      if (data === "start_new_quote") {
        await resetSession(supabase, chatId);
        await sendWelcomeMessage(TELEGRAM_BOT_TOKEN!, chatId);
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "🔄 بدء عرض جديد");
        return new Response("OK", { headers: corsHeaders });
      }

      await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "");
      return new Response("OK", { headers: corsHeaders });
    }

    return new Response("OK", { headers: corsHeaders });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

async function getSession(supabase: any, chatId: number): Promise<Session> {
  const { data } = await supabase.from("bot_sessions").select("*").eq("chat_id", chatId).single();
  if (data) return { chat_id: chatId, state: data.state as BotState, data: data.data || {} };
  await supabase.from("bot_sessions").insert({ chat_id: chatId, state: "IDLE", data: {} });
  return { chat_id: chatId, state: "IDLE", data: {} };
}

async function updateSession(supabase: any, chatId: number, state: BotState, data: SessionData): Promise<void> {
  await supabase.from("bot_sessions").upsert({ chat_id: chatId, state, data, updated_at: new Date().toISOString() }, { onConflict: "chat_id" });
}

async function resetSession(supabase: any, chatId: number): Promise<Session> {
  await supabase.from("bot_sessions").upsert({ chat_id: chatId, state: "IDLE", data: {}, updated_at: new Date().toISOString() }, { onConflict: "chat_id" });
  return { chat_id: chatId, state: "IDLE", data: {} };
}

// ============================================================================
// STATE 1: WELCOME MESSAGE
// ============================================================================

async function sendWelcomeMessage(token: string, chatId: number) {
  const keyboard = {
    inline_keyboard: [[{ text: "إنشاء عرض سعر جديد 📝", callback_data: "new_quote" }]],
  };
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "مرحباً بك في نظام تسعير عالم الفخامة 🌟\n\nنظام آلي لإنشاء عروض أسعار رحلات جورجيا\nيعمل على مدار الساعة 24/7",
      reply_markup: keyboard,
    }),
  });
}

// ============================================================================
// STATE 2: DAYS PROMPT
// ============================================================================

async function sendDaysPrompt(token: string, chatId: number) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "كم عدد أيام الرحلة؟ 🗓️\n\nاكتب الرقم مباشرة (مثال: 7)",
    }),
  });
}

// ============================================================================
// STATE 3: AIRPORT SELECTION
// ============================================================================

async function sendAirportSelection(token: string, chatId: number) {
  const keyboard = {
    inline_keyboard: [
      [{ text: "مطار تبليسي - TBS ✈️", callback_data: "airport_TBS" }],
      [{ text: "مطار باتومي - BUS ✈️", callback_data: "airport_BUS" }],
      [{ text: "مطار كوتايسي - KUT ✈️", callback_data: "airport_KUT" }],
    ],
  };
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: "الرجاء اختيار مطار الوصول: ✈️", reply_markup: keyboard }),
  });
}

// ============================================================================
// STATE 4: CITY SELECTION - ask_cities()
// ============================================================================

async function askCities(token: string, chatId: number, data: SessionData) {
  const selectedCities = data.selectedCities || [];
  const totalNights = data.totalNights || data.days || 0;
  
  const cityButtons = CITIES.map(city => ({
    text: selectedCities.includes(city.id) ? `✅ ${city.emoji} ${city.nameAr}` : `${city.emoji} ${city.nameAr}`,
    callback_data: `city_${city.id}`,
  }));

  const rows: any[][] = [];
  for (let i = 0; i < cityButtons.length; i += 2) {
    rows.push(cityButtons.slice(i, i + 2));
  }
  rows.push([{ text: "✅ متابعة", callback_data: "cities_done" }]);

  const selectedText = selectedCities.length > 0
    ? `\n\n🏙️ المدن المختارة:\n${selectedCities.map(c => `• ${CITIES.find(x => x.id === c)?.nameAr}`).join("\n")}`
    : "\n\n⚠️ لم يتم اختيار أي مدينة بعد";

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `اختر المدن التي ستزورها في الرحلة 🏙️\n\n📅 إجمالي الليالي: ${totalNights} ليلة\n\n(اضغط على المدينة لاختيارها/إلغاء اختيارها)${selectedText}`,
      reply_markup: { inline_keyboard: rows },
    }),
  });
}

async function updateCitiesMessage(token: string, chatId: number, messageId: number, data: SessionData) {
  const selectedCities = data.selectedCities || [];
  const totalNights = data.totalNights || data.days || 0;

  const cityButtons = CITIES.map(city => ({
    text: selectedCities.includes(city.id) ? `✅ ${city.emoji} ${city.nameAr}` : `${city.emoji} ${city.nameAr}`,
    callback_data: `city_${city.id}`,
  }));

  const rows: any[][] = [];
  for (let i = 0; i < cityButtons.length; i += 2) {
    rows.push(cityButtons.slice(i, i + 2));
  }
  rows.push([{ text: "✅ متابعة", callback_data: "cities_done" }]);

  const selectedText = selectedCities.length > 0
    ? `\n\n🏙️ المدن المختارة:\n${selectedCities.map(c => `• ${CITIES.find(x => x.id === c)?.nameAr}`).join("\n")}`
    : "\n\n⚠️ لم يتم اختيار أي مدينة بعد";

  await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: `اختر المدن التي ستزورها في الرحلة 🏙️\n\n📅 إجمالي الليالي: ${totalNights} ليلة\n\n(اضغط على المدينة لاختيارها/إلغاء اختيارها)${selectedText}`,
      reply_markup: { inline_keyboard: rows },
    }),
  });
}

// ============================================================================
// STATE 5: NIGHTS DISTRIBUTION - ask_nights_for_city()
// ============================================================================

async function askNightsForCity(token: string, chatId: number, data: SessionData) {
  const cityNights = data.cityNights || [];
  const currentIndex = data.currentCityIndex || 0;
  const totalNights = data.totalNights || data.days || 0;

  if (currentIndex >= cityNights.length) {
    // All cities done - show summary
    await showNightsSummary(token, chatId, data);
    return;
  }

  const currentCity = cityNights[currentIndex];
  const cityInfo = CITIES.find(c => c.id === currentCity.city);
  const cityNameAr = cityInfo?.nameAr || currentCity.city;
  const cityEmoji = cityInfo?.emoji || "🏙️";

  // Calculate distributed and remaining nights
  const distributedNights = cityNights.reduce((sum, cn) => sum + cn.nights, 0);
  const remainingNights = totalNights - distributedNights;

  // Navigation buttons
  const navButtons: any[] = [];
  if (currentIndex > 0) {
    navButtons.push({ text: "🔙 المدينة السابقة", callback_data: "prev_city" });
  }
  navButtons.push({ text: "🏙️ تعديل المدن", callback_data: "edit_cities" });

  // Quick nights buttons
  const nightsButtons: any[][] = [];
  const maxNights = Math.min(remainingNights + currentCity.nights, 10);
  const row1: any[] = [];
  const row2: any[] = [];
  for (let i = 1; i <= Math.min(5, maxNights); i++) {
    row1.push({ text: `${i}`, callback_data: `nights_${i}` });
  }
  for (let i = 6; i <= Math.min(10, maxNights); i++) {
    row2.push({ text: `${i}`, callback_data: `nights_${i}` });
  }
  if (row1.length > 0) nightsButtons.push(row1);
  if (row2.length > 0) nightsButtons.push(row2);
  nightsButtons.push(navButtons);

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `${cityEmoji} كم عدد الليالي في *${cityNameAr}*؟\n\n` +
            `📊 الليالي المتبقية: ${remainingNights} من ${totalNights}\n` +
            `📍 المدينة ${currentIndex + 1} من ${cityNights.length}\n\n` +
            `اختر من الأزرار أو اكتب الرقم:`,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: nightsButtons },
    }),
  });
}

async function handleNightsInput(supabase: any, token: string, chatId: number, session: Session, nights: number) {
  const cityNights = session.data.cityNights || [];
  const currentIndex = session.data.currentCityIndex || 0;

  if (currentIndex < cityNights.length) {
    cityNights[currentIndex].nights = nights;
    session.data.cityNights = cityNights;
    session.data.currentCityIndex = currentIndex + 1;
    
    await updateSession(supabase, chatId, "AWAITING_NIGHTS", session.data);
    await askNightsForCity(token, chatId, session.data);
  }
}

// ============================================================================
// STATE 6: NIGHTS SUMMARY - show_nights_summary()
// ============================================================================

async function showNightsSummary(token: string, chatId: number, data: SessionData) {
  const cityNights = data.cityNights || [];
  const totalNights = data.totalNights || data.days || 0;
  const distributedNights = cityNights.reduce((sum, cn) => sum + cn.nights, 0);
  const difference = totalNights - distributedNights;

  let summaryText = `📋 ملخص توزيع الليالي:\n\n`;
  for (const cn of cityNights) {
    const cityInfo = CITIES.find(c => c.id === cn.city);
    summaryText += `${cityInfo?.emoji || "🏙️"} ${cityInfo?.nameAr || cn.city}: ${cn.nights} ${cn.nights === 1 ? "ليلة" : "ليالي"}\n`;
  }
  summaryText += `\n━━━━━━━━━━━━━━━━\n`;
  summaryText += `📊 المجموع: ${distributedNights} من ${totalNights} ليلة`;

  if (difference !== 0) {
    // Mismatch - show warning
    const warningText = difference > 0 
      ? `\n\n⚠️ نقص: ${difference} ${Math.abs(difference) === 1 ? "ليلة" : "ليالي"}`
      : `\n\n⚠️ زيادة: ${Math.abs(difference)} ${Math.abs(difference) === 1 ? "ليلة" : "ليالي"}`;

    const keyboard = {
      inline_keyboard: [
        [{ text: "🔄 تعديل الليالي", callback_data: "edit_nights" }],
        [{ text: "🏙️ تعديل المدن", callback_data: "edit_cities" }],
      ],
    };

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: summaryText + warningText + "\n\nيرجى تعديل التوزيع ليتطابق مع إجمالي الليالي.",
        reply_markup: keyboard,
      }),
    });
  } else {
    // Match - proceed to view preference
    await sendViewPreferencePrompt(token, chatId);
  }
}

// ============================================================================
// STATE 7: VIEW PREFERENCE
// ============================================================================

async function sendViewPreferencePrompt(token: string, chatId: number) {
  const keyboard = {
    inline_keyboard: [
      [{ text: "🖼️ مع إطلالة", callback_data: "view_with" }],
      [{ text: "🏨 بدون إطلالة", callback_data: "view_without" }],
    ],
  };

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "✅ تم توزيع الليالي بنجاح!\n\nاختر نوع الإطلالة المفضل:",
      reply_markup: keyboard,
    }),
  });
}

// ============================================================================
// STATE 8: ADULTS PROMPT
// ============================================================================

async function sendAdultsPrompt(token: string, chatId: number) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "كم عدد البالغين (أكبر من 12 سنة)؟ 👨‍👩‍👦\n\nاكتب الرقم مباشرة (مثال: 2)",
    }),
  });
}

// ============================================================================
// STATE 9: CHILDREN CHECK
// ============================================================================

async function sendChildrenCheckPrompt(token: string, chatId: number) {
  const keyboard = {
    inline_keyboard: [[
      { text: "نعم يوجد 👶", callback_data: "children_yes" },
      { text: "لا يوجد ❌", callback_data: "children_no" },
    ]],
  };
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: "هل يوجد أطفال (12 سنة أو أقل)؟ 👶", reply_markup: keyboard }),
  });
}

// ============================================================================
// STATE 10: CHILD AGES
// ============================================================================

async function sendChildAgesPrompt(token: string, chatId: number) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "الرجاء كتابة أعمار الأطفال مفصولة بمسافة:\n\nمثال: 4 7 10\n\n📌 سياسة الأعمار:\n• الأطفال 6 سنوات أو أقل = مجاناً\n• الأطفال فوق 6 سنوات = يُحسبون كبالغين",
    }),
  });
}

// ============================================================================
// STATE 11: PROCESSING & QUOTE GENERATION
// ============================================================================

async function processAndGenerateQuote(supabase: any, token: string, chatId: number, data: SessionData) {
  const processingMsg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: "⏳ جاري تحليل البيانات وحساب أفضل توزيع للغرف والسيارات..." }),
  });
  const processingMsgData = await processingMsg.json();
  const processingMessageId = processingMsgData.result?.message_id;

  const quote = await generateQuotation(supabase, data);

  if (processingMessageId) {
    await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: processingMessageId }),
    });
  }

  const keyboard = {
    inline_keyboard: [
      [{ text: "📋 نسخ / إرسال العرض للعميل", callback_data: "copy_quote" }],
      [{ text: "🔄 إنشاء عرض جديد", callback_data: "start_new_quote" }],
    ],
  };

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: quote, reply_markup: keyboard }),
  });

  await resetSession(supabase, chatId);
}

// ============================================================================
// QUOTATION GENERATOR
// ============================================================================

async function generateQuotation(supabase: any, data: SessionData): Promise<string> {
  const days = data.days!;
  const cityNights = data.cityNights || [];
  const adults = data.adults!;
  const airportName = data.airportName || "مطار تبليسي";
  const viewPref = data.viewPreference || "no_view";
  const childrenOver6 = data.childrenOver6 || 0;
  const childrenUnder6 = data.childrenUnder6 || 0;
  const effectivePax = data.effectivePax || adults;
  const totalChildren = childrenOver6 + childrenUnder6;

  const [settingsRes, servicesRes, carPricingRes, tier1Res, tier2Res, tier3Res, tier4Res, tier5Res] = 
    await Promise.all([
      supabase.from("system_settings").select("*").single(),
      supabase.from("mandatory_services").select("*").single(),
      supabase.from("car_pricing").select("*").eq("is_active", true).order("min_pax"),
      supabase.from("hotel_offers").select("*").eq("offer_tier", "tier_1").eq("is_active", true),
      supabase.from("hotel_offers").select("*").eq("offer_tier", "tier_2").eq("is_active", true),
      supabase.from("hotel_offers").select("*").eq("offer_tier", "tier_3").eq("is_active", true),
      supabase.from("hotel_offers").select("*").eq("offer_tier", "tier_4").eq("is_active", true),
      supabase.from("hotel_offers").select("*").eq("offer_tier", "tier_5").eq("is_active", true),
    ]);

  const profitMargin = settingsRes.data?.profit_margin ?? 22;
  const exchangeRate = settingsRes.data?.exchange_rate_usd_to_sar ?? 3.8;
  const freeSimCards = settingsRes.data?.free_sim_cards_allowance ?? 2;
  const simCardPrice = servicesRes.data?.sim_card_price ?? 15;
  const carPricing = carPricingRes.data || [];
  const tierOffers = [tier1Res.data || [], tier2Res.data || [], tier3Res.data || [], tier4Res.data || [], tier5Res.data || []];

  const allocation = allocateRooms(effectivePax);

  let roomConfigText = "";
  if (allocation.tripleRooms > 0) roomConfigText += `${allocation.tripleRooms} ثلاثية`;
  if (allocation.doubleRooms > 0) roomConfigText += (roomConfigText ? " + " : "") + `${allocation.doubleRooms} مزدوجة`;
  if (allocation.singleRooms > 0) roomConfigText += (roomConfigText ? " + " : "") + `${allocation.singleRooms} مفردة`;
  if (!roomConfigText) roomConfigText = "غرفة واحدة";

  const carTier = carPricing.find((c: any) => effectivePax >= c.min_pax && effectivePax <= c.max_pax);
  const carDailyRate = carTier?.price_per_day ?? carPricing[carPricing.length - 1]?.price_per_day ?? 100;
  const carCost = carDailyRate * days;
  const simCost = effectivePax > freeSimCards ? (effectivePax - freeSimCards) * simCardPrice : 0;

  const tierLabels = ["💎 العرض الأول (اقتصادي)", "💎 العرض الثاني (ستاندرد)", "💎 العرض الثالث (متوسط)", "💎 العرض الرابع (ديلوكس)", "💎 العرض الخامس (فاخر)"];
  const offerBlocks: string[] = [];

  for (let i = 0; i < 5; i++) {
    const hotels = tierOffers[i];
    let hotelCost = 0;
    const hotelList: string[] = [];

    for (const cn of cityNights) {
      const hotel = hotels.find((h: any) => h.city.toLowerCase() === cn.city.toLowerCase());
      const cityInfo = CITIES.find(c => c.id === cn.city);
      
      if (hotel) {
        const dblPrice = viewPref === "view" ? hotel.dbl_view : hotel.dbl_no_view;
        const trblPrice = viewPref === "view" ? hotel.trbl_view : hotel.trbl_no_view;
        const nightCost = (allocation.tripleRooms * trblPrice) + (allocation.doubleRooms * dblPrice) + (allocation.singleRooms * dblPrice);
        hotelCost += nightCost * cn.nights;
        hotelList.push(`• ${cityInfo?.nameAr || cn.city} (${cn.nights} ليالي): ${hotel.hotel_name}`);
      } else {
        hotelList.push(`• ${cityInfo?.nameAr || cn.city} (${cn.nights} ليالي): فندق محلي مميز`);
      }
    }

    const initialCost = hotelCost + carCost + simCost;
    const withProfit = initialCost * (1 + profitMargin / 100);
    const finalPrice = Math.round(withProfit * exchangeRate / 10) * 10;
    const usdPrice = Math.round(withProfit / 10) * 10;

    offerBlocks.push(
      `━━━━━━━━━━━━━━━━━━━━\n${tierLabels[i]}:\n💵 السعر: ${finalPrice.toLocaleString()} ر.س ($${usdPrice})\n🏨 الفنادق:\n${hotelList.join("\n")}`
    );
  }

  const carOnlyInitial = carCost + simCost;
  const carOnlyWithProfit = carOnlyInitial * (1 + profitMargin / 100);
  const carOnlyFinal = Math.round(carOnlyWithProfit * exchangeRate / 10) * 10;
  const carOnlyUsd = Math.round(carOnlyWithProfit / 10) * 10;

  const carOnlyBlock = `━━━━━━━━━━━━━━━━━━━━\n🚗 عرض سيارة فقط: ${carOnlyFinal.toLocaleString()} ر.س ($${carOnlyUsd})`;

  const servicesBlock = `━━━━━━━━━━━━━━━━━━━━\n✅ الخدمات المشمولة:\n• استقبال/توديع من ${airportName}\n• سيارة خاصة مع سائق\n• إفطار يومي\n• شرائح اتصال\n• تأمين سفر`;

  const viewText = viewPref === "view" ? "مع إطلالة" : "بدون إطلالة";
  let childrenDisplay = totalChildren > 0 ? ` | أطفال: ${totalChildren}${childrenUnder6 > 0 ? ` (${childrenUnder6} مجاناً)` : ""}` : "";
  const routeText = cityNights.map(cn => CITIES.find(c => c.id === cn.city)?.nameAr || cn.city).join(" → ");

  return (
    `🌟 عروض عالم الفخامة - جورجيا 🌟\n\n📋 ملخص الطلب:\n` +
    `• المدة: ${days} أيام\n• المطار: ${airportName}\n• الإطلالة: ${viewText}\n` +
    `• البالغين: ${adults}${childrenDisplay}\n• الفعلي: ${effectivePax} شخص\n` +
    `• الغرف: ${allocation.totalRooms} (${roomConfigText})\n• المسار: ${routeText}\n\n` +
    offerBlocks.join("\n\n") + "\n\n" + carOnlyBlock + "\n\n" + servicesBlock
  );
}

// ============================================================================
// TELEGRAM HELPERS
// ============================================================================

async function sendTelegram(token: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function answerCallbackQuery(token: string, callbackQueryId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
  });
}
