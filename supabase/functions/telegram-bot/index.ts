/**
 * ============================================================================
 * LUXURY WORLD (عالم الفخامة) - Telegram Bot Interactive FSM Wizard
 * ============================================================================
 * 
 * STRICT FSM WORKFLOW (7 States):
 * 
 * State 1 (START):
 *   - User sends /start
 *   - Bot: "مرحباً بك في نظام تسعير عالم الفخامة 🌟"
 *   - Inline Button: [إنشاء عرض سعر جديد]
 * 
 * State 2 (AWAITING_DAYS):
 *   - Bot: "كم عدد أيام الرحلة؟ 🗓️"
 *   - User types number
 * 
 * State 3 (AWAITING_AIRPORT):
 *   - Bot: "الرجاء اختيار مطار الوصول: ✈️"
 *   - Inline Buttons: [مطار تبليسي - TBS] [مطار باتومي - BUS] [مطار كوتايسي - KUT]
 * 
 * State 4 (AWAITING_ADULTS):
 *   - Bot: "كم عدد البالغين (أكبر من 12 سنة)؟ 👨‍👩‍👦"
 *   - User types number
 * 
 * State 5 (AWAITING_CHILDREN_CHECK):
 *   - Bot: "هل يوجد أطفال (12 سنة أو أقل)؟ 👶"
 *   - Inline Buttons: [نعم يوجد] [لا يوجد]
 * 
 * State 6 (AWAITING_CHILD_AGES) - Only if "نعم يوجد":
 *   - Bot: "الرجاء كتابة أعمار الأطفال مفصولة بمسافة (مثال: 4 7 10):"
 *   - User types ages
 * 
 * State 7 (PROCESSING):
 *   - Bot: "⏳ جاري تحليل البيانات وحساب أفضل توزيع للغرف والسيارات..."
 *   - Calculate Effective Pax, Room Allocation, Car Tier
 *   - Delete temp message
 *   - Output final Arabic quotation + [نسخ / إرسال العرض للعميل] button
 * 
 * AGE POLICY:
 * - Children ≤ 6 years: COMPLETELY FREE (no room, no car, no SIM)
 * - Children > 6 years: Count as FULL ADULT
 * - Effective Pax = Adults + (Children > 6)
 * 
 * @version 3.1.0
 * @date March 6, 2026
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// FSM STATES (Strict 7-State Flow)
// ============================================================================

type BotState = 
  | "IDLE"                    // State 1: Waiting for /start
  | "AWAITING_DAYS"           // State 2: Waiting for days input
  | "AWAITING_AIRPORT"        // State 3: Waiting for airport selection
  | "AWAITING_ADULTS"         // State 4: Waiting for adults count
  | "AWAITING_CHILDREN_CHECK" // State 5: Waiting for Yes/No children
  | "AWAITING_CHILD_AGES"     // State 6: Waiting for child ages
  | "PROCESSING";             // State 7: Calculating and outputting

interface SessionData {
  days?: number;
  airport?: string;           // TBS, BUS, or KUT
  airportName?: string;       // Arabic name for display
  adults?: number;
  hasChildren?: boolean;
  childAges?: number[];       // Array of each child's age
  childrenOver6?: number;     // Auto-calculated from ages
  childrenUnder6?: number;    // Auto-calculated from ages
  effectivePax?: number;      // Auto-calculated: adults + childrenOver6
  processingMessageId?: number; // To delete the processing message
}

interface Session {
  chat_id: number;
  state: BotState;
  data: SessionData;
}

// ============================================================================
// AIRPORTS
// ============================================================================

const AIRPORTS = [
  { id: "TBS", nameAr: "مطار تبليسي", nameEn: "Tbilisi International Airport", city: "Tbilisi" },
  { id: "BUS", nameAr: "مطار باتومي", nameEn: "Batumi International Airport", city: "Batumi" },
  { id: "KUT", nameAr: "مطار كوتايسي", nameEn: "Kutaisi International Airport", city: "Kutaisi" },
];

// ============================================================================
// CITIES FOR ROUTE DISTRIBUTION
// ============================================================================

const CITIES = [
  { id: "Tbilisi", nameAr: "تبليسي" },
  { id: "Batumi", nameAr: "باتومي" },
  { id: "Gudauri", nameAr: "غوداوري" },
  { id: "Borjomi", nameAr: "بورجومي" },
  { id: "Bakuriani", nameAr: "باكورياني" },
  { id: "Kutaisi", nameAr: "كوتايسي" },
  { id: "Dashbash", nameAr: "داشباش" },
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

  if (effectivePax <= 6) {
    return strictMapping[effectivePax];
  }

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

    // ========================================================================
    // HANDLE TEXT MESSAGES
    // ========================================================================
    if (body.message) {
      const chatId = body.message.chat.id;
      const text = body.message.text?.trim() || "";

      let session = await getSession(supabase, chatId);

      // ----------------------------------------------------------------------
      // STATE 1: /start Command
      // ----------------------------------------------------------------------
      if (text === "/start") {
        await resetSession(supabase, chatId);
        await sendWelcomeMessage(TELEGRAM_BOT_TOKEN!, chatId);
        return new Response("OK", { headers: corsHeaders });
      }

      // ----------------------------------------------------------------------
      // STATE 2: AWAITING_DAYS - User types number of days
      // ----------------------------------------------------------------------
      if (session.state === "AWAITING_DAYS") {
        const days = parseInt(text);
        if (isNaN(days) || days < 1 || days > 30) {
          await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, 
            "⚠️ يرجى إدخال رقم صحيح بين 1 و 30 يوماً."
          );
          return new Response("OK", { headers: corsHeaders });
        }

        session.data.days = days;
        await updateSession(supabase, chatId, "AWAITING_AIRPORT", session.data);
        await sendAirportSelection(TELEGRAM_BOT_TOKEN!, chatId);
        return new Response("OK", { headers: corsHeaders });
      }

      // ----------------------------------------------------------------------
      // STATE 4: AWAITING_ADULTS - User types number of adults
      // ----------------------------------------------------------------------
      if (session.state === "AWAITING_ADULTS") {
        const adults = parseInt(text);
        if (isNaN(adults) || adults < 1 || adults > 50) {
          await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, 
            "⚠️ يرجى إدخال عدد صحيح للبالغين (1-50)."
          );
          return new Response("OK", { headers: corsHeaders });
        }

        session.data.adults = adults;
        await updateSession(supabase, chatId, "AWAITING_CHILDREN_CHECK", session.data);
        await sendChildrenCheckPrompt(TELEGRAM_BOT_TOKEN!, chatId);
        return new Response("OK", { headers: corsHeaders });
      }

      // ----------------------------------------------------------------------
      // STATE 6: AWAITING_CHILD_AGES - User types ages separated by space
      // ----------------------------------------------------------------------
      if (session.state === "AWAITING_CHILD_AGES") {
        const agesText = text.replace(/،/g, " ").replace(/,/g, " ");
        const ageStrings = agesText.split(/\s+/).filter(s => s.length > 0);
        const ages: number[] = [];

        for (const ageStr of ageStrings) {
          const age = parseInt(ageStr);
          if (isNaN(age) || age < 0 || age > 17) {
            await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, 
              "⚠️ يرجى إدخال أعمار صحيحة (0-17) مفصولة بمسافة.\n\nمثال: 4 7 10"
            );
            return new Response("OK", { headers: corsHeaders });
          }
          ages.push(age);
        }

        if (ages.length === 0) {
          await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, 
            "⚠️ يرجى إدخال عمر واحد على الأقل.\n\nمثال: 4 7 10"
          );
          return new Response("OK", { headers: corsHeaders });
        }

        session.data.childAges = ages;
        const { effectivePax, childrenOver6, childrenUnder6 } = calculateEffectivePax(
          session.data.adults!,
          ages
        );
        session.data.effectivePax = effectivePax;
        session.data.childrenOver6 = childrenOver6;
        session.data.childrenUnder6 = childrenUnder6;

        await updateSession(supabase, chatId, "PROCESSING", session.data);
        await processAndGenerateQuote(supabase, TELEGRAM_BOT_TOKEN!, chatId, session.data);
        return new Response("OK", { headers: corsHeaders });
      }

      // Default: prompt to start
      await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, 
        "أرسل /start لبدء إنشاء عرض سعر جديد."
      );
      return new Response("OK", { headers: corsHeaders });
    }

    // ========================================================================
    // HANDLE CALLBACK QUERIES (Button Presses)
    // ========================================================================
    if (body.callback_query) {
      const callback = body.callback_query;
      const chatId = callback.message.chat.id;
      const data = callback.data;

      let session = await getSession(supabase, chatId);

      // ----------------------------------------------------------------------
      // "إنشاء عرض سعر جديد" Button → Start State 2 (Days)
      // ----------------------------------------------------------------------
      if (data === "new_quote") {
        session = await resetSession(supabase, chatId);
        await updateSession(supabase, chatId, "AWAITING_DAYS", {});
        await sendDaysPrompt(TELEGRAM_BOT_TOKEN!, chatId);
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, "");
        return new Response("OK", { headers: corsHeaders });
      }

      // ----------------------------------------------------------------------
      // Airport Selection (State 3)
      // ----------------------------------------------------------------------
      if (data.startsWith("airport_")) {
        const airportId = data.replace("airport_", "");
        const airport = AIRPORTS.find(a => a.id === airportId);
        
        if (airport) {
          session.data.airport = airport.id;
          session.data.airportName = airport.nameAr;
          await updateSession(supabase, chatId, "AWAITING_ADULTS", session.data);
          await sendAdultsPrompt(TELEGRAM_BOT_TOKEN!, chatId);
          await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, `✅ تم اختيار ${airport.nameAr}`);
        }
        return new Response("OK", { headers: corsHeaders });
      }

      // ----------------------------------------------------------------------
      // Children Check: Yes/No (State 5)
      // ----------------------------------------------------------------------
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

      // ----------------------------------------------------------------------
      // Copy/Forward Quote Button
      // ----------------------------------------------------------------------
      if (data === "copy_quote") {
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callback.id, 
          "✅ قم بإعادة توجيه الرسالة أعلاه للعميل مباشرة"
        );
        return new Response("OK", { headers: corsHeaders });
      }

      // ----------------------------------------------------------------------
      // New Quote after completion
      // ----------------------------------------------------------------------
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
// STATE 1: WELCOME MESSAGE WITH BUTTON
// ============================================================================

async function sendWelcomeMessage(token: string, chatId: number) {
  const keyboard = {
    inline_keyboard: [
      [{ text: "إنشاء عرض سعر جديد 📝", callback_data: "new_quote" }],
    ],
  };

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "مرحباً بك في نظام تسعير عالم الفخامة 🌟\n\n" +
            "نظام آلي لإنشاء عروض أسعار رحلات جورجيا\n" +
            "يعمل على مدار الساعة 24/7",
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
      text: "كم عدد أيام الرحلة؟ 🗓️\n\n" +
            "اكتب الرقم مباشرة (مثال: 7)",
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
    body: JSON.stringify({
      chat_id: chatId,
      text: "الرجاء اختيار مطار الوصول: ✈️",
      reply_markup: keyboard,
    }),
  });
}

// ============================================================================
// STATE 4: ADULTS PROMPT
// ============================================================================

async function sendAdultsPrompt(token: string, chatId: number) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "كم عدد البالغين (أكبر من 12 سنة)؟ 👨‍👩‍👦\n\n" +
            "اكتب الرقم مباشرة (مثال: 2)",
    }),
  });
}

// ============================================================================
// STATE 5: CHILDREN CHECK
// ============================================================================

async function sendChildrenCheckPrompt(token: string, chatId: number) {
  const keyboard = {
    inline_keyboard: [
      [
        { text: "نعم يوجد 👶", callback_data: "children_yes" },
        { text: "لا يوجد ❌", callback_data: "children_no" },
      ],
    ],
  };

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "هل يوجد أطفال (12 سنة أو أقل)؟ 👶",
      reply_markup: keyboard,
    }),
  });
}

// ============================================================================
// STATE 6: CHILD AGES PROMPT
// ============================================================================

async function sendChildAgesPrompt(token: string, chatId: number) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "الرجاء كتابة أعمار الأطفال مفصولة بمسافة:\n\n" +
            "مثال: 4 7 10\n\n" +
            "📌 سياسة الأعمار:\n" +
            "• الأطفال 6 سنوات أو أقل = مجاناً\n" +
            "• الأطفال فوق 6 سنوات = يُحسبون كبالغين",
    }),
  });
}

// ============================================================================
// STATE 7: PROCESSING & QUOTE GENERATION
// ============================================================================

async function processAndGenerateQuote(supabase: any, token: string, chatId: number, data: SessionData) {
  // Send processing message
  const processingMsg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "⏳ جاري تحليل البيانات وحساب أفضل توزيع للغرف والسيارات...",
    }),
  });

  const processingMsgData = await processingMsg.json();
  const processingMessageId = processingMsgData.result?.message_id;

  // Generate the quotation
  const quote = await generateQuotation(supabase, data);

  // Delete processing message
  if (processingMessageId) {
    await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: processingMessageId,
      }),
    });
  }

  // Send final quote with button
  const keyboard = {
    inline_keyboard: [
      [{ text: "📋 نسخ / إرسال العرض للعميل", callback_data: "copy_quote" }],
      [{ text: "🔄 إنشاء عرض جديد", callback_data: "start_new_quote" }],
    ],
  };

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: quote,
      reply_markup: keyboard,
    }),
  });

  // Reset session
  await resetSession(supabase, chatId);
}

// ============================================================================
// QUOTATION GENERATOR
// ============================================================================

async function generateQuotation(supabase: any, data: SessionData): Promise<string> {
  const days = data.days!;
  const nights = days;
  const adults = data.adults!;
  const airportName = data.airportName || "مطار تبليسي";
  const childrenOver6 = data.childrenOver6 || 0;
  const childrenUnder6 = data.childrenUnder6 || 0;
  const effectivePax = data.effectivePax || adults;
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

  // Smart room allocation
  const allocation = allocateRooms(effectivePax);

  // Room config text
  let roomConfigText = "";
  if (allocation.tripleRooms > 0) roomConfigText += `${allocation.tripleRooms} ثلاثية`;
  if (allocation.doubleRooms > 0) roomConfigText += (roomConfigText ? " + " : "") + `${allocation.doubleRooms} مزدوجة`;
  if (allocation.singleRooms > 0) roomConfigText += (roomConfigText ? " + " : "") + `${allocation.singleRooms} مفردة`;
  if (!roomConfigText) roomConfigText = "غرفة واحدة";

  // Auto-generate route based on days
  const cityStays = getCityDistribution(nights, data.airport || "TBS");

  // Car rate based on Effective Pax
  const carTier = carPricing.find((c: any) => effectivePax >= c.min_pax && effectivePax <= c.max_pax);
  const carDailyRate = carTier?.price_per_day ?? carPricing[carPricing.length - 1]?.price_per_day ?? 100;
  const carCost = carDailyRate * days;

  // SIM cost
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
        const dblSglNoView = hotel.dbl_no_view;
        const trblNoView = hotel.trbl_no_view;
        const dblSglView = hotel.dbl_view;
        const trblView = hotel.trbl_view;

        const nightCostNoView = 
          (allocation.tripleRooms * trblNoView) + 
          (allocation.doubleRooms * dblSglNoView) + 
          (allocation.singleRooms * dblSglNoView);
          
        const nightCostWithView = 
          (allocation.tripleRooms * trblView) + 
          (allocation.doubleRooms * dblSglView) + 
          (allocation.singleRooms * dblSglView);

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
      `🏨 الفنادق:\n` +
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
    `يشمل: سيارة مع سائق لمدة ${days} أيام، شرائح اتصال، تأمين شامل.`;

  const servicesBlock = 
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `✅ الخدمات المشمولة:\n` +
    `• استقبال وتوديع من/إلى ${airportName}\n` +
    `• سيارة خاصة مع سائق طوال الرحلة\n` +
    `• إفطار يومي في الفنادق\n` +
    `• شرائح اتصال مع إنترنت\n` +
    `• تأمين سفر شامل`;

  // Age breakdown display
  let childrenDisplay = "";
  if (totalChildren > 0) {
    childrenDisplay = ` | الأطفال: ${totalChildren}`;
    if (childrenUnder6 > 0) {
      childrenDisplay += ` (${childrenUnder6} مجاناً)`;
    }
  }

  const routeText = cityStays.map(s => CITIES.find(c => c.id === s.city)?.nameAr || s.city).join(" → ");

  return (
    `🌟 عروض عالم الفخامة - جورجيا 🌟\n\n` +
    `📋 ملخص الطلب:\n` +
    `• المدة: ${days} أيام (${nights} ليالي)\n` +
    `• المطار: ${airportName}\n` +
    `• البالغين: ${adults}${childrenDisplay}\n` +
    `• العدد الفعلي للحساب: ${effectivePax} شخص\n` +
    `• تكوين الغرف: ${allocation.totalRooms} غرفة (${roomConfigText})\n` +
    `• المسار: ${routeText}\n\n` +
    offerBlocks.join("\n\n") + "\n\n" +
    carOnlyBlock + "\n\n" +
    servicesBlock
  );
}

// ============================================================================
// ROUTE DISTRIBUTION BASED ON DAYS & AIRPORT
// ============================================================================

function getCityDistribution(totalNights: number, airport: string): { city: string; nights: number }[] {
  // Start and end at arrival airport city
  const startCity = airport === "BUS" ? "Batumi" : airport === "KUT" ? "Kutaisi" : "Tbilisi";
  
  if (totalNights <= 3) {
    return [{ city: startCity, nights: totalNights }];
  }
  
  if (totalNights <= 5) {
    if (startCity === "Tbilisi") {
      return [
        { city: "Tbilisi", nights: 2 },
        { city: "Batumi", nights: totalNights - 2 },
      ];
    } else {
      return [
        { city: startCity, nights: 2 },
        { city: "Tbilisi", nights: totalNights - 2 },
      ];
    }
  }
  
  if (totalNights <= 7) {
    return [
      { city: "Tbilisi", nights: 2 },
      { city: "Gudauri", nights: 1 },
      { city: "Batumi", nights: totalNights - 3 },
    ];
  }
  
  if (totalNights <= 10) {
    return [
      { city: "Tbilisi", nights: 2 },
      { city: "Gudauri", nights: 1 },
      { city: "Borjomi", nights: 1 },
      { city: "Batumi", nights: totalNights - 4 },
    ];
  }
  
  // 11+ nights
  return [
    { city: "Tbilisi", nights: 3 },
    { city: "Gudauri", nights: 2 },
    { city: "Borjomi", nights: 1 },
    { city: "Bakuriani", nights: 2 },
    { city: "Batumi", nights: totalNights - 8 },
  ];
}

// ============================================================================
// TELEGRAM API HELPERS
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
