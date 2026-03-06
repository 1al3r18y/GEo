/**
 * ============================================================================
 * LUXURY WORLD (عالم الفخامة) - Telegram Bot with FSM Wizard
 * ============================================================================
 * 
 * Interactive step-by-step quotation wizard using Finite State Machine (FSM)
 * 
 * AGE-BASED OCCUPANCY RULES:
 * - Children ≤ 6 years: COMPLETELY FREE (ignored in rooms & car)
 * - Children > 6 years: Counted as FULL ADULT
 * - Effective Pax = Adults + (Children > 6)
 * 
 * ROOM ALLOCATION (Strict Mapping):
 * - 1 Pax = 1 Single (billed at DBL/SGL price)
 * - 2 Pax = 1 Double
 * - 3 Pax = 1 Triple
 * - 4 Pax = 2 Doubles
 * - 5 Pax = 1 Double + 1 Triple
 * - 6 Pax = 2 Triples
 * - Priority: Triple rooms to minimize total rooms
 * 
 * DATABASE COLUMNS ORDER:
 * City | Hotel Name | DBL_SGL_NoView | TRBL_NoView | DBL_SGL_View | TRBL_View
 * 
 * @version 3.0.0
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
  | "AWAITING_CITIES"
  | "AWAITING_ADULTS"
  | "AWAITING_CHILDREN_COUNT"
  | "AWAITING_CHILD_AGES"
  | "PROCESSING";

interface SessionData {
  days?: number;
  nights?: number;
  selectedCities?: string[];
  adults?: number;
  totalChildren?: number;
  childAges?: number[];        // Array of each child's age
  childrenOver6?: number;      // Auto-calculated from ages
  childrenUnder6?: number;     // Auto-calculated from ages
  effectivePax?: number;       // Auto-calculated: adults + childrenOver6
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
  { id: "Tbilisi", nameAr: "تبليسي", nameEn: "Tbilisi" },
  { id: "Batumi", nameAr: "باتومي", nameEn: "Batumi" },
  { id: "Gudauri", nameAr: "غوداوري", nameEn: "Gudauri" },
  { id: "Borjomi", nameAr: "بورجومي", nameEn: "Borjomi" },
  { id: "Bakuriani", nameAr: "باكورياني", nameEn: "Bakuriani" },
  { id: "Kutaisi", nameAr: "كوتايسي", nameEn: "Kutaisi" },
  { id: "Dashbash", nameAr: "داشباش", nameEn: "Dashbash" },
];

// ============================================================================
// SMART ROOM ALLOCATION ENGINE (STRICT MAPPING)
// ============================================================================

interface RoomAllocation {
  singleRooms: number;
  doubleRooms: number;
  tripleRooms: number;
  totalRooms: number;
  effectivePax: number;
}

/**
 * Allocates rooms based on Effective Pax using STRICT mapping:
 * 1 Pax = 1 Single | 2 Pax = 1 Double | 3 Pax = 1 Triple
 * 4 Pax = 2 Doubles | 5 Pax = 1 Double + 1 Triple | 6 Pax = 2 Triples
 * Priority: Triple rooms to minimize total rooms
 */
function allocateRooms(effectivePax: number): RoomAllocation {
  if (effectivePax <= 0) {
    return { singleRooms: 0, doubleRooms: 0, tripleRooms: 0, totalRooms: 0, effectivePax: 0 };
  }

  // Strict mapping for 1-6 pax
  const strictMapping: Record<number, RoomAllocation> = {
    1: { singleRooms: 1, doubleRooms: 0, tripleRooms: 0, totalRooms: 1, effectivePax: 1 },
    2: { singleRooms: 0, doubleRooms: 1, tripleRooms: 0, totalRooms: 1, effectivePax: 2 },
    3: { singleRooms: 0, doubleRooms: 0, tripleRooms: 1, totalRooms: 1, effectivePax: 3 },
    4: { singleRooms: 0, doubleRooms: 2, tripleRooms: 0, totalRooms: 2, effectivePax: 4 },
    5: { singleRooms: 0, doubleRooms: 1, tripleRooms: 1, totalRooms: 2, effectivePax: 5 },
    6: { singleRooms: 0, doubleRooms: 0, tripleRooms: 2, totalRooms: 2, effectivePax: 6 },
  };

  if (effectivePax <= 6) {
    return strictMapping[effectivePax];
  }

  // For 7+ pax: prioritize triples to minimize total rooms
  let tripleRooms = Math.floor(effectivePax / 3);
  const remaining = effectivePax % 3;
  let doubleRooms = 0;
  let singleRooms = 0;

  switch (remaining) {
    case 0: break;
    case 1:
      // 1 remaining: convert 1 triple to 2 doubles (3+1=4 = 2x2)
      if (tripleRooms > 0) { tripleRooms--; doubleRooms = 2; }
      else { singleRooms = 1; }
      break;
    case 2:
      doubleRooms = 1;
      break;
  }

  return {
    singleRooms,
    doubleRooms,
    tripleRooms,
    totalRooms: singleRooms + doubleRooms + tripleRooms,
    effectivePax,
  };
}

/**
 * Calculate Effective Pax from child ages
 * - Children ≤ 6: FREE (don't count)
 * - Children > 6: Count as full adult
 */
function calculateEffectivePax(adults: number, childAges: number[]): { effectivePax: number; childrenOver6: number; childrenUnder6: number } {
  let childrenOver6 = 0;
  let childrenUnder6 = 0;

  for (const age of childAges) {
    if (age > 6) {
      childrenOver6++;
    } else {
      childrenUnder6++;
    }
  }

  return {
    effectivePax: adults + childrenOver6,
    childrenOver6,
    childrenUnder6,
  };
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

    // Handle text messages
    if (body.message) {
      const chatId = body.message.chat.id;
      const text = body.message.text?.trim() || "";

      // Get or create session
      let session = await getSession(supabase, chatId);

      // Handle /start command - reset and begin wizard
      if (text === "/start" || text === "/quote") {
        session = await resetSession(supabase, chatId);
        await sendDaysPrompt(TELEGRAM_BOT_TOKEN!, chatId);
        await updateSession(supabase, chatId, "AWAITING_DAYS", {});
        return new Response("OK", { headers: corsHeaders });
      }

      // Handle /cancel command
      if (text === "/cancel") {
        await resetSession(supabase, chatId);
        await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, "❌ تم إلغاء العملية.\n\nأرسل /start لبدء عرض سعر جديد.");
        return new Response("OK", { headers: corsHeaders });
      }

      // Process based on current state
      switch (session.state) {
        case "IDLE":
          await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, 
            "🌟 مرحباً بك في نظام عالم الفخامة 🌟\n\nأرسل /start لبدء عرض سعر جديد."
          );
          break;

        case "AWAITING_DAYS":
          const days = parseInt(text);
          if (isNaN(days) || days < 1 || days > 30) {
            await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, 
              "⚠️ يرجى إدخال رقم صحيح بين 1 و 30 يوماً."
            );
          } else {
            session.data.days = days;
            session.data.nights = days;
            await updateSession(supabase, chatId, "AWAITING_CITIES", session.data);
            await sendCitiesSelection(TELEGRAM_BOT_TOKEN!, chatId, days, []);
          }
          break;

        case "AWAITING_ADULTS":
          const adults = parseInt(text);
          if (isNaN(adults) || adults < 1 || adults > 50) {
            await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, 
              "⚠️ يرجى إدخال عدد صحيح للبالغين (1-50)."
            );
          } else {
            session.data.adults = adults;
            await updateSession(supabase, chatId, "AWAITING_CHILDREN_COUNT", session.data);
            await sendChildrenCountPrompt(TELEGRAM_BOT_TOKEN!, chatId);
          }
          break;

        case "AWAITING_CHILDREN_COUNT":
          const childCount = parseInt(text);
          if (isNaN(childCount) || childCount < 0 || childCount > 20) {
            await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, 
              "⚠️ يرجى إدخال عدد صحيح (0-20)."
            );
          } else if (childCount === 0) {
            // No children - proceed to processing
            session.data.totalChildren = 0;
            session.data.childAges = [];
            session.data.childrenOver6 = 0;
            session.data.childrenUnder6 = 0;
            session.data.effectivePax = session.data.adults;
            await updateSession(supabase, chatId, "PROCESSING", session.data);
            
            await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, "⏳ جاري حساب العروض...");
            const quote = await generateQuotation(supabase, session.data);
            await sendTelegramWithKeyboard(TELEGRAM_BOT_TOKEN!, chatId, quote);
            await resetSession(supabase, chatId);
          } else {
            // Has children - ask for ages
            session.data.totalChildren = childCount;
            session.data.childAges = [];
            await updateSession(supabase, chatId, "AWAITING_CHILD_AGES", session.data);
            await sendChildAgePrompt(TELEGRAM_BOT_TOKEN!, chatId, 1, childCount);
          }
          break;

        case "AWAITING_CHILD_AGES":
          const age = parseInt(text);
          if (isNaN(age) || age < 0 || age > 17) {
            await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, 
              "⚠️ يرجى إدخال عمر صحيح (0-17 سنة)."
            );
          } else {
            const childAges = session.data.childAges || [];
            childAges.push(age);
            session.data.childAges = childAges;

            const totalChildren = session.data.totalChildren || 0;
            const collectedCount = childAges.length;

            if (collectedCount < totalChildren) {
              // Ask for next child's age
              await updateSession(supabase, chatId, "AWAITING_CHILD_AGES", session.data);
              await sendChildAgePrompt(TELEGRAM_BOT_TOKEN!, chatId, collectedCount + 1, totalChildren);
            } else {
              // All ages collected - calculate effective pax
              const { effectivePax, childrenOver6, childrenUnder6 } = calculateEffectivePax(
                session.data.adults!,
                childAges
              );
              
              session.data.effectivePax = effectivePax;
              session.data.childrenOver6 = childrenOver6;
              session.data.childrenUnder6 = childrenUnder6;
              
              await updateSession(supabase, chatId, "PROCESSING", session.data);

              // Show age summary
              const ageSummary = childrenUnder6 > 0 
                ? `\n📌 ملاحظة: ${childrenUnder6} طفل (6 سنوات أو أقل) = مجاناً`
                : "";
              
              await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, 
                `✅ تم تسجيل أعمار الأطفال\n` +
                `• أطفال فوق 6 سنوات: ${childrenOver6} (يُحسبون كبالغين)\n` +
                `• أطفال 6 سنوات أو أقل: ${childrenUnder6} (مجاناً)${ageSummary}\n` +
                `• العدد الفعلي للحساب: ${effectivePax} شخص\n\n` +
                `⏳ جاري حساب العروض...`
              );
              
              const quote = await generateQuotation(supabase, session.data);
              await sendTelegramWithKeyboard(TELEGRAM_BOT_TOKEN!, chatId, quote);
              await resetSession(supabase, chatId);
            }
          }
          break;

        case "AWAITING_CITIES":
          await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, 
            "⚠️ يرجى اختيار المدن من الأزرار أدناه، ثم اضغط 'تأكيد ✅'"
          );
          break;

        default:
          await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, 
            "أرسل /start لبدء عرض سعر جديد."
          );
      }

      return new Response("OK", { headers: corsHeaders });
    }

    // Handle callback queries (button presses)
    if (body.callback_query) {
      const callback = body.callback_query;
      const chatId = callback.message.chat.id;
      const messageId = callback.message.message_id;
      const data = callback.data;

      let session = await getSession(supabase, chatId);

      // Days selection from buttons
      if (data.startsWith("days_")) {
        const daysStr = data.replace("days_", "");
        if (daysStr === "custom") {
          await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, "✏️ أدخل عدد الأيام:");
          await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "");
        } else {
          const days = parseInt(daysStr);
          session.data.days = days;
          session.data.nights = days;
          await updateSession(supabase, chatId, "AWAITING_CITIES", session.data);
          await sendCitiesSelection(TELEGRAM_BOT_TOKEN!, chatId, days, []);
          await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, `✅ ${days} أيام`);
        }
      }

      // City selection handling
      else if (data.startsWith("city_")) {
        const cityId = data.replace("city_", "");
        const selectedCities = session.data.selectedCities || [];
        
        if (selectedCities.includes(cityId)) {
          session.data.selectedCities = selectedCities.filter(c => c !== cityId);
        } else {
          session.data.selectedCities = [...selectedCities, cityId];
        }
        
        await updateSession(supabase, chatId, "AWAITING_CITIES", session.data);
        await updateCitiesSelection(TELEGRAM_BOT_TOKEN!, chatId, messageId, session.data.days!, session.data.selectedCities);
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "");
      }
      
      // Confirm cities selection
      else if (data === "confirm_cities") {
        const selectedCities = session.data.selectedCities || [];
        
        if (selectedCities.length === 0) {
          await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "⚠️ يرجى اختيار مدينة واحدة على الأقل");
        } else {
          await updateSession(supabase, chatId, "AWAITING_ADULTS", session.data);
          await sendAdultsPrompt(TELEGRAM_BOT_TOKEN!, chatId, selectedCities);
          await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "✅ تم تأكيد المدن");
        }
      }
      
      // Auto-suggest route based on days
      else if (data === "auto_route") {
        const suggestedCities = getSuggestedRoute(session.data.days!);
        session.data.selectedCities = suggestedCities;
        await updateSession(supabase, chatId, "AWAITING_ADULTS", session.data);
        await sendAdultsPrompt(TELEGRAM_BOT_TOKEN!, chatId, suggestedCities);
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "✅ تم اختيار المسار المقترح");
      }
      
      // Quick number buttons for adults
      else if (data.startsWith("adults_")) {
        const num = parseInt(data.replace("adults_", ""));
        session.data.adults = num;
        await updateSession(supabase, chatId, "AWAITING_CHILDREN_COUNT", session.data);
        await sendChildrenCountPrompt(TELEGRAM_BOT_TOKEN!, chatId);
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "");
      }
      
      // Children count from buttons
      else if (data.startsWith("children_")) {
        const num = parseInt(data.replace("children_", ""));
        if (num === 0) {
          // No children - proceed directly
          session.data.totalChildren = 0;
          session.data.childAges = [];
          session.data.childrenOver6 = 0;
          session.data.childrenUnder6 = 0;
          session.data.effectivePax = session.data.adults;
          await updateSession(supabase, chatId, "PROCESSING", session.data);
          
          await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, "⏳ جاري حساب العروض...");
          const quote = await generateQuotation(supabase, session.data);
          await sendTelegramWithKeyboard(TELEGRAM_BOT_TOKEN!, chatId, quote);
          await resetSession(supabase, chatId);
        } else {
          session.data.totalChildren = num;
          session.data.childAges = [];
          await updateSession(supabase, chatId, "AWAITING_CHILD_AGES", session.data);
          await sendChildAgePrompt(TELEGRAM_BOT_TOKEN!, chatId, 1, num);
        }
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "");
      }
      
      // Child age from buttons
      else if (data.startsWith("age_")) {
        const age = parseInt(data.replace("age_", ""));
        const childAges = session.data.childAges || [];
        childAges.push(age);
        session.data.childAges = childAges;

        const totalChildren = session.data.totalChildren || 0;
        const collectedCount = childAges.length;

        if (collectedCount < totalChildren) {
          await updateSession(supabase, chatId, "AWAITING_CHILD_AGES", session.data);
          await sendChildAgePrompt(TELEGRAM_BOT_TOKEN!, chatId, collectedCount + 1, totalChildren);
        } else {
          // All ages collected
          const { effectivePax, childrenOver6, childrenUnder6 } = calculateEffectivePax(
            session.data.adults!,
            childAges
          );
          
          session.data.effectivePax = effectivePax;
          session.data.childrenOver6 = childrenOver6;
          session.data.childrenUnder6 = childrenUnder6;
          
          await updateSession(supabase, chatId, "PROCESSING", session.data);

          const ageSummary = childrenUnder6 > 0 
            ? `\n📌 ${childrenUnder6} طفل (≤6 سنوات) = مجاناً`
            : "";
          
          await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, 
            `✅ تم تسجيل الأعمار\n` +
            `• العدد الفعلي: ${effectivePax} شخص${ageSummary}\n\n` +
            `⏳ جاري حساب العروض...`
          );
          
          const quote = await generateQuotation(supabase, session.data);
          await sendTelegramWithKeyboard(TELEGRAM_BOT_TOKEN!, chatId, quote);
          await resetSession(supabase, chatId);
        }
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "");
      }
      
      // New quote
      else if (data === "new_quote") {
        await resetSession(supabase, chatId);
        await sendDaysPrompt(TELEGRAM_BOT_TOKEN!, chatId);
        await updateSession(supabase, chatId, "AWAITING_DAYS", {});
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "🔄 بدء عرض جديد");
      }
      
      // Forward quote
      else if (data === "forward_quote") {
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "↗️ قم بإعادة توجيه الرسالة أعلاه للعميل");
      }

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
  const { data } = await supabase
    .from("bot_sessions")
    .select("*")
    .eq("chat_id", chatId)
    .single();

  if (data) {
    return { chat_id: chatId, state: data.state as BotState, data: data.data || {} };
  }

  await supabase.from("bot_sessions").insert({ chat_id: chatId, state: "IDLE", data: {} });
  return { chat_id: chatId, state: "IDLE", data: {} };
}

async function updateSession(supabase: any, chatId: number, state: BotState, data: SessionData): Promise<void> {
  await supabase
    .from("bot_sessions")
    .upsert({ chat_id: chatId, state, data, updated_at: new Date().toISOString() }, { onConflict: "chat_id" });
}

async function resetSession(supabase: any, chatId: number): Promise<Session> {
  await supabase
    .from("bot_sessions")
    .upsert({ chat_id: chatId, state: "IDLE", data: {}, updated_at: new Date().toISOString() }, { onConflict: "chat_id" });
  return { chat_id: chatId, state: "IDLE", data: {} };
}

// ============================================================================
// WIZARD STEP PROMPTS
// ============================================================================

async function sendDaysPrompt(token: string, chatId: number) {
  const keyboard = {
    inline_keyboard: [
      [
        { text: "5 أيام", callback_data: "days_5" },
        { text: "7 أيام", callback_data: "days_7" },
        { text: "10 أيام", callback_data: "days_10" },
      ],
      [
        { text: "14 يوم", callback_data: "days_14" },
        { text: "أخرى ⌨️", callback_data: "days_custom" },
      ],
    ],
  };

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "🌟 *معالج عروض الأسعار - عالم الفخامة* 🌟\n\n" +
            "━━━━━━━━━━━━━━━━━━━━\n" +
            "📅 *الخطوة 1/4*: كم عدد أيام الرحلة؟\n" +
            "━━━━━━━━━━━━━━━━━━━━\n\n" +
            "اختر من الأزرار أو اكتب الرقم مباشرة:",
      parse_mode: "Markdown",
      reply_markup: keyboard,
    }),
  });
}

async function sendCitiesSelection(token: string, chatId: number, days: number, selected: string[]) {
  const cityButtons = CITIES.map(city => ({
    text: selected.includes(city.id) ? `✅ ${city.nameAr}` : city.nameAr,
    callback_data: `city_${city.id}`,
  }));

  const rows: any[][] = [];
  for (let i = 0; i < cityButtons.length; i += 2) {
    rows.push(cityButtons.slice(i, i + 2));
  }

  rows.push([{ text: "🗺️ مسار مقترح تلقائي", callback_data: "auto_route" }]);
  rows.push([{ text: "تأكيد ✅", callback_data: "confirm_cities" }]);

  const keyboard = { inline_keyboard: rows };
  const selectedText = selected.length > 0 
    ? `المدن المختارة: ${selected.map(c => CITIES.find(x => x.id === c)?.nameAr).join("، ")}`
    : "لم يتم اختيار أي مدينة بعد";

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `━━━━━━━━━━━━━━━━━━━━\n` +
            `🏙️ *الخطوة 2/4*: اختر المدن المطلوبة\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `مدة الرحلة: *${days} أيام*\n\n` +
            `${selectedText}\n\n` +
            `اضغط على المدن لإضافتها/إزالتها:`,
      parse_mode: "Markdown",
      reply_markup: keyboard,
    }),
  });
}

async function updateCitiesSelection(token: string, chatId: number, messageId: number, days: number, selected: string[]) {
  const cityButtons = CITIES.map(city => ({
    text: selected.includes(city.id) ? `✅ ${city.nameAr}` : city.nameAr,
    callback_data: `city_${city.id}`,
  }));

  const rows: any[][] = [];
  for (let i = 0; i < cityButtons.length; i += 2) {
    rows.push(cityButtons.slice(i, i + 2));
  }

  rows.push([{ text: "🗺️ مسار مقترح تلقائي", callback_data: "auto_route" }]);
  rows.push([{ text: "تأكيد ✅", callback_data: "confirm_cities" }]);

  const keyboard = { inline_keyboard: rows };
  const selectedText = selected.length > 0 
    ? `المدن المختارة: ${selected.map(c => CITIES.find(x => x.id === c)?.nameAr).join("، ")}`
    : "لم يتم اختيار أي مدينة بعد";

  await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: `━━━━━━━━━━━━━━━━━━━━\n` +
            `🏙️ *الخطوة 2/4*: اختر المدن المطلوبة\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `مدة الرحلة: *${days} أيام*\n\n` +
            `${selectedText}\n\n` +
            `اضغط على المدن لإضافتها/إزالتها:`,
      parse_mode: "Markdown",
      reply_markup: keyboard,
    }),
  });
}

async function sendAdultsPrompt(token: string, chatId: number, selectedCities: string[]) {
  const citiesText = selectedCities.map(c => CITIES.find(x => x.id === c)?.nameAr).join(" → ");
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: "1", callback_data: "adults_1" },
        { text: "2", callback_data: "adults_2" },
        { text: "3", callback_data: "adults_3" },
        { text: "4", callback_data: "adults_4" },
      ],
      [
        { text: "5", callback_data: "adults_5" },
        { text: "6", callback_data: "adults_6" },
        { text: "8", callback_data: "adults_8" },
        { text: "10", callback_data: "adults_10" },
      ],
    ],
  };

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `━━━━━━━━━━━━━━━━━━━━\n` +
            `👥 *الخطوة 3/4*: كم عدد البالغين؟\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `المسار: *${citiesText}*\n\n` +
            `اختر من الأزرار أو اكتب الرقم:`,
      parse_mode: "Markdown",
      reply_markup: keyboard,
    }),
  });
}

async function sendChildrenCountPrompt(token: string, chatId: number) {
  const keyboard = {
    inline_keyboard: [
      [
        { text: "0 (لا يوجد)", callback_data: "children_0" },
        { text: "1", callback_data: "children_1" },
        { text: "2", callback_data: "children_2" },
      ],
      [
        { text: "3", callback_data: "children_3" },
        { text: "4", callback_data: "children_4" },
        { text: "5+", callback_data: "children_5" },
      ],
    ],
  };

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `━━━━━━━━━━━━━━━━━━━━\n` +
            `👶 *الخطوة 4/4*: كم عدد الأطفال؟\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📌 *سياسة الأعمار:*\n` +
            `• الأطفال 6 سنوات أو أقل = *مجاناً*\n` +
            `• الأطفال فوق 6 سنوات = يُحسبون كبالغين\n\n` +
            `اختر العدد الإجمالي للأطفال:`,
      parse_mode: "Markdown",
      reply_markup: keyboard,
    }),
  });
}

async function sendChildAgePrompt(token: string, chatId: number, childNumber: number, totalChildren: number) {
  const keyboard = {
    inline_keyboard: [
      [
        { text: "1 سنة", callback_data: "age_1" },
        { text: "2", callback_data: "age_2" },
        { text: "3", callback_data: "age_3" },
        { text: "4", callback_data: "age_4" },
      ],
      [
        { text: "5", callback_data: "age_5" },
        { text: "6", callback_data: "age_6" },
        { text: "7", callback_data: "age_7" },
        { text: "8", callback_data: "age_8" },
      ],
      [
        { text: "9", callback_data: "age_9" },
        { text: "10", callback_data: "age_10" },
        { text: "11", callback_data: "age_11" },
        { text: "12+", callback_data: "age_12" },
      ],
    ],
  };

  const ageEmoji = childNumber === 1 ? "👶" : childNumber === 2 ? "👧" : "👦";

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: `${ageEmoji} *عمر الطفل ${childNumber} من ${totalChildren}:*\n\n` +
            `اختر العمر أو اكتبه:`,
      parse_mode: "Markdown",
      reply_markup: keyboard,
    }),
  });
}

// ============================================================================
// SUGGESTED ROUTE BASED ON DAYS
// ============================================================================

function getSuggestedRoute(days: number): string[] {
  if (days <= 3) return ["Tbilisi"];
  if (days <= 5) return ["Tbilisi", "Batumi"];
  if (days <= 7) return ["Tbilisi", "Gudauri", "Batumi"];
  if (days <= 10) return ["Tbilisi", "Gudauri", "Borjomi", "Batumi"];
  return ["Tbilisi", "Gudauri", "Borjomi", "Bakuriani", "Batumi"];
}

function getCityDistribution(days: number, selectedCities: string[]): { city: string; nights: number }[] {
  const totalNights = days;
  const cityCount = selectedCities.length;
  
  if (cityCount === 0) return [];
  if (cityCount === 1) return [{ city: selectedCities[0], nights: totalNights }];

  const baseNights = Math.floor(totalNights / cityCount);
  const extraNights = totalNights % cityCount;

  return selectedCities.map((city, i) => ({
    city,
    nights: baseNights + (i < extraNights ? 1 : 0),
  }));
}

// ============================================================================
// QUOTATION GENERATOR
// ============================================================================

async function generateQuotation(supabase: any, data: SessionData): Promise<string> {
  const days = data.days!;
  const nights = days;
  const adults = data.adults!;
  const childrenOver6 = data.childrenOver6 || 0;
  const childrenUnder6 = data.childrenUnder6 || 0;
  const selectedCities = data.selectedCities || ["Tbilisi", "Batumi"];

  // Effective Pax = Adults + Children > 6 (children ≤6 are FREE)
  const effectivePax = data.effectivePax || (adults + childrenOver6);
  const totalChildren = childrenOver6 + childrenUnder6;

  // Fetch all dynamic data
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

  // Smart room allocation based on Effective Pax
  const allocation = allocateRooms(effectivePax);

  // Room config text
  let roomConfigText = "";
  if (allocation.tripleRooms > 0) roomConfigText += `${allocation.tripleRooms} ثلاثية`;
  if (allocation.doubleRooms > 0) roomConfigText += (roomConfigText ? " + " : "") + `${allocation.doubleRooms} مزدوجة`;
  if (allocation.singleRooms > 0) roomConfigText += (roomConfigText ? " + " : "") + `${allocation.singleRooms} مفردة`;
  if (!roomConfigText) roomConfigText = "غرفة واحدة";

  // City distribution
  const cityStays = getCityDistribution(nights, selectedCities);

  // Car rate based on Effective Pax (children ≤6 don't count for car)
  const carTier = carPricing.find((c: any) => effectivePax >= c.min_pax && effectivePax <= c.max_pax);
  const carDailyRate = carTier?.price_per_day ?? carPricing[carPricing.length - 1]?.price_per_day ?? 100;
  const carCost = carDailyRate * days;

  // SIM cost (only for adults + children > 6)
  const simCost = effectivePax > freeSimCards ? (effectivePax - freeSimCards) * simCardPrice : 0;

  // Tier labels
  const tierLabels = ["💎 العرض الأول (اقتصادي مميز)", "💎 العرض الثاني (ستاندرد)", "💎 العرض الثالث (متوسط)", "💎 العرض الرابع (ديلوكس)", "💎 العرض الخامس (فاخر جداً)"];

  // Generate offers
  const offerBlocks: string[] = [];

  for (let i = 0; i < 5; i++) {
    const hotels = tierOffers[i];
    
    let hotelCostNoView = 0;
    let hotelCostWithView = 0;
    const hotelList: string[] = [];

    for (const stay of cityStays) {
      const hotel = hotels.find((h: any) => h.city.toLowerCase() === stay.city.toLowerCase());
      const cityNameAr = CITIES.find(c => c.id === stay.city)?.nameAr || stay.city;
      
      if (hotel) {
        // DATABASE COLUMNS: DBL_SGL_NoView | TRBL_NoView | DBL_SGL_View | TRBL_View
        // Single = Double price (DBL_SGL)
        const dblSglNoView = hotel.dbl_no_view;  // DBL_SGL_NoView
        const trblNoView = hotel.trbl_no_view;   // TRBL_NoView
        const dblSglView = hotel.dbl_view;       // DBL_SGL_View
        const trblView = hotel.trbl_view;        // TRBL_View

        // Calculate nightly costs based on room allocation
        // Single rooms use DBL_SGL price
        const nightCostNoView = 
          (allocation.tripleRooms * trblNoView) + 
          (allocation.doubleRooms * dblSglNoView) + 
          (allocation.singleRooms * dblSglNoView);  // Single = DBL price
          
        const nightCostWithView = 
          (allocation.tripleRooms * trblView) + 
          (allocation.doubleRooms * dblSglView) + 
          (allocation.singleRooms * dblSglView);    // Single = DBL price

        hotelCostNoView += nightCostNoView * stay.nights;
        hotelCostWithView += nightCostWithView * stay.nights;
        hotelList.push(`• ${cityNameAr} (${stay.nights} ليالي): ${hotel.hotel_name}`);
      } else {
        hotelList.push(`• ${cityNameAr} (${stay.nights} ليالي): فندق محلي مميز`);
      }
    }

    const initialNoView = hotelCostNoView + carCost + simCost;
    const initialWithView = hotelCostWithView + carCost + simCost;

    const withProfitNoView = initialNoView * (1 + profitMargin / 100);
    const withProfitWithView = initialWithView * (1 + profitMargin / 100);

    const finalNoView = Math.round(withProfitNoView * exchangeRate / 10) * 10;
    const finalWithView = Math.round(withProfitWithView * exchangeRate / 10) * 10;

    const usdNoView = Math.round(withProfitNoView / 10) * 10;
    const usdWithView = Math.round(withProfitWithView / 10) * 10;

    offerBlocks.push(
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `${tierLabels[i]}:\n` +
      `💵 السعر بدون إطلالة: ${finalNoView.toLocaleString()} ر.س ($${usdNoView})\n` +
      `🖼️ السعر مع إطلالة: ${finalWithView.toLocaleString()} ر.س ($${usdWithView})\n` +
      `🏨 الفنادق وتوزيع الليالي:\n` +
      hotelList.join("\n")
    );
  }

  // Car only offer
  const carOnlyInitial = carCost + simCost;
  const carOnlyWithProfit = carOnlyInitial * (1 + profitMargin / 100);
  const carOnlyFinal = Math.round(carOnlyWithProfit * exchangeRate / 10) * 10;
  const carOnlyUsd = Math.round(carOnlyWithProfit / 10) * 10;

  const carOnlyBlock = 
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🚗 عرض سيارة فقط (بدون إقامة): ${carOnlyFinal.toLocaleString()} ر.س ($${carOnlyUsd})\n` +
    `يشمل: سيارة مع سائق لمدة ${days} أيام، خطوط اتصال، وتأمين شامل.`;

  const servicesBlock = 
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `✅ الخدمات المشمولة في العروض الفندقية:\n` +
    `• استقبال وتوديع من وإلى المطار.\n` +
    `• سيارة خاصة مع سائق طوال فترة الرحلة.\n` +
    `• إفطار يومي في الفنادق.\n` +
    `• شرائح اتصال مع إنترنت.\n` +
    `• تأمين سفر شامل.`;

  // Build final message
  const routeText = cityStays.map(s => CITIES.find(c => c.id === s.city)?.nameAr || s.city).join(" → ");

  // Age breakdown display
  let childrenDisplay = "";
  if (totalChildren > 0) {
    childrenDisplay = `| الأطفال: ${totalChildren}`;
    if (childrenUnder6 > 0) {
      childrenDisplay += ` (${childrenUnder6} مجاناً)`;
    }
  }

  return (
    `🌟 عروض عالم الفخامة - جورجيا 🌟\n` +
    `📋 ملخص الطلب:\n` +
    `• المدة: ${days} أيام (${nights} ليالي)\n` +
    `• البالغين: ${adults} ${childrenDisplay}\n` +
    `• العدد الفعلي للحساب: ${effectivePax} شخص\n` +
    `• تكوين الغرف: ${allocation.totalRooms} غرفة (${roomConfigText})\n` +
    `• المسار: ${routeText}\n\n` +
    offerBlocks.join("\n\n") + "\n\n" +
    carOnlyBlock + "\n\n" +
    servicesBlock
  );
}

// ============================================================================
// TELEGRAM API HELPERS
// ============================================================================

async function sendTelegram(token: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

async function sendTelegramWithKeyboard(token: string, chatId: number, text: string) {
  const keyboard = {
    inline_keyboard: [
      [{ text: "🔄 عرض سعر جديد", callback_data: "new_quote" }],
      [{ text: "↗️ إعادة توجيه العرض", callback_data: "forward_quote" }],
    ],
  };

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, reply_markup: keyboard }),
  });
}

async function answerCallbackQuery(token: string, callbackQueryId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
  });
}
