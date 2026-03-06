/**
 * ============================================================================
 * LUXURY WORLD (عالم الفخامة) - Telegram Bot Webhook Handler
 * ============================================================================
 * 
 * 24/7 Automated Quotation Generator for Customer Service Team
 * Uses Supabase Edge Functions for webhook-based continuous uptime
 * 
 * Features:
 * - Dynamic pricing from central database
 * - 5 offer tiers with View/No-View options
 * - Smart room allocation
 * - One-click copy/forward functionality
 * 
 * @version 2.0.0
 * @date March 6, 2026
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface QuoteRequest {
  arrivalDate: string;
  departureDate: string;
  adults: number;
  childrenOver6: number;
  childrenUnder6: number;
}

interface RoomAllocation {
  tripleRooms: number;
  doubleRooms: number;
  singleRooms: number;
  totalRooms: number;
  effectivePax: number;
}

interface HotelOffer {
  city: string;
  hotelName: string;
  dblView: number;
  dblNoView: number;
  trblView: number;
  trblNoView: number;
}

interface CarPricing {
  minPax: number;
  maxPax: number;
  pricePerDay: number;
}

interface SystemSettings {
  profitMargin: number;
  exchangeRateUsdToSar: number;
  freeSimCardsAllowance: number;
  simCardPrice: number;
}

interface CityStay {
  city: string;
  nights: number;
}

// ============================================================================
// SMART ROOM ALLOCATION ENGINE
// ============================================================================

function allocateRooms(effectivePax: number): RoomAllocation {
  if (effectivePax <= 0) {
    return { tripleRooms: 0, doubleRooms: 0, singleRooms: 0, totalRooms: 0, effectivePax: 0 };
  }

  let tripleRooms = Math.floor(effectivePax / 3);
  const remaining = effectivePax % 3;
  let doubleRooms = 0;
  let singleRooms = 0;

  switch (remaining) {
    case 0:
      break;
    case 1:
      if (tripleRooms > 0) {
        tripleRooms--;
        doubleRooms = 2;
      } else {
        singleRooms = 1;
      }
      break;
    case 2:
      doubleRooms = 1;
      break;
  }

  return {
    tripleRooms,
    doubleRooms,
    singleRooms,
    totalRooms: tripleRooms + doubleRooms + singleRooms,
    effectivePax,
  };
}

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

function daysBetween(d1: string, d2: string): number {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return Math.ceil((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}

function getCarDailyRate(totalPax: number, carPricing: CarPricing[]): number {
  const tier = carPricing.find(c => totalPax >= c.minPax && totalPax <= c.maxPax);
  if (!tier) {
    const maxTier = carPricing.reduce((max, c) => c.maxPax > max.maxPax ? c : max, carPricing[0]);
    return maxTier?.pricePerDay ?? 0;
  }
  return tier.pricePerDay;
}

function calculateHotelCost(
  cityStays: CityStay[],
  allocation: RoomAllocation,
  hotelOffers: HotelOffer[],
  withView: boolean
): number {
  let totalCost = 0;
  
  for (const stay of cityStays) {
    const hotel = hotelOffers.find(h => h.city.toLowerCase() === stay.city.toLowerCase());
    if (hotel) {
      const doublePrice = withView ? hotel.dblView : hotel.dblNoView;
      const triplePrice = withView ? hotel.trblView : hotel.trblNoView;
      const costPerNight = 
        (allocation.tripleRooms * triplePrice) + 
        (allocation.doubleRooms * doublePrice) +
        (allocation.singleRooms * doublePrice);
      totalCost += costPerNight * stay.nights;
    }
  }
  
  return totalCost;
}

function roundToNearest10(price: number): number {
  return Math.round(price / 10) * 10;
}

// ============================================================================
// MAIN BOT HANDLER
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

    // Handle Telegram webhook
    if (body.message) {
      const chatId = body.message.chat.id;
      const text = body.message.text || "";

      if (text === "/start") {
        const welcomeMsg = 
          `🌟 مرحباً بك في نظام عالم الفخامة - جورجيا 🌟\n\n` +
          `نظام تسعير آلي يعمل على مدار الساعة 24/7\n\n` +
          `📝 لطلب عرض سعر، أرسل:\n` +
          `/quote YYYY-MM-DD YYYY-MM-DD بالغين أطفال_فوق_6 أطفال_تحت_6\n\n` +
          `📌 مثال:\n` +
          `/quote 2026-07-01 2026-07-08 2 1 1\n\n` +
          `سيتم حساب:\n` +
          `• 5 عروض فندقية (مع وبدون إطلالة)\n` +
          `• توزيع الغرف الذكي تلقائياً\n` +
          `• عرض سيارة فقط\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `💎 عالم الفخامة - Luxury World`;

        await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, welcomeMsg);
        return new Response("OK", { headers: corsHeaders });
      }

      if (text.startsWith("/quote")) {
        const parts = text.split(" ").slice(1);
        if (parts.length < 5) {
          await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId,
            `❌ صيغة غير صحيحة\n\n` +
            `الصيغة الصحيحة:\n` +
            `/quote تاريخ_وصول تاريخ_مغادرة بالغين أطفال_فوق_6 أطفال_تحت_6\n\n` +
            `مثال:\n` +
            `/quote 2026-07-01 2026-07-08 2 1 0`
          );
          return new Response("OK", { headers: corsHeaders });
        }

        const request: QuoteRequest = {
          arrivalDate: parts[0],
          departureDate: parts[1],
          adults: parseInt(parts[2]) || 0,
          childrenOver6: parseInt(parts[3]) || 0,
          childrenUnder6: parseInt(parts[4]) || 0,
        };

        // Generate quotation
        const quoteMessage = await generateQuotation(supabase, request);
        
        // Send with inline keyboard for copy/forward
        await sendTelegramWithKeyboard(TELEGRAM_BOT_TOKEN!, chatId, quoteMessage);
        
        return new Response("OK", { headers: corsHeaders });
      }

      // Handle callback queries (button presses)
      await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, 
        `أرسل /start للبدء أو /quote لطلب عرض سعر`
      );
      return new Response("OK", { headers: corsHeaders });
    }

    // Handle callback query (inline button press)
    if (body.callback_query) {
      const callbackQuery = body.callback_query;
      const data = callbackQuery.data;
      
      if (data === "copy_quote") {
        // Answer callback to remove loading state
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN!, callbackQuery.id, 
          "تم! يمكنك الآن إعادة توجيه الرسالة للعميل"
        );
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
// QUOTATION GENERATOR
// ============================================================================

async function generateQuotation(supabase: any, req: QuoteRequest): Promise<string> {
  const totalDays = daysBetween(req.arrivalDate, req.departureDate);
  const totalNights = totalDays;
  const effectivePax = req.adults + req.childrenOver6;
  const totalPax = req.adults + req.childrenOver6 + req.childrenUnder6;

  // Fetch all dynamic data from database
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

  const settings: SystemSettings = {
    profitMargin: settingsRes.data?.profit_margin ?? 22,
    exchangeRateUsdToSar: settingsRes.data?.exchange_rate_usd_to_sar ?? 3.8,
    freeSimCardsAllowance: settingsRes.data?.free_sim_cards_allowance ?? 2,
    simCardPrice: servicesRes.data?.sim_card_price ?? 15,
  };

  const carPricing: CarPricing[] = (carPricingRes.data || []).map((c: any) => ({
    minPax: c.min_pax,
    maxPax: c.max_pax,
    pricePerDay: c.price_per_day,
  }));

  const tierOffers: HotelOffer[][] = [
    tier1Res.data || [],
    tier2Res.data || [],
    tier3Res.data || [],
    tier4Res.data || [],
    tier5Res.data || [],
  ].map(tierData => tierData.map((h: any) => ({
    city: h.city,
    hotelName: h.hotel_name,
    dblView: h.dbl_view,
    dblNoView: h.dbl_no_view,
    trblView: h.trbl_view,
    trblNoView: h.trbl_no_view,
  })));

  // Smart room allocation
  const allocation = allocateRooms(effectivePax);

  // Format room configuration text
  let roomConfigText = "";
  if (allocation.tripleRooms > 0) roomConfigText += `${allocation.tripleRooms} ثلاثية`;
  if (allocation.doubleRooms > 0) roomConfigText += (roomConfigText ? " + " : "") + `${allocation.doubleRooms} مزدوجة`;
  if (allocation.singleRooms > 0) roomConfigText += (roomConfigText ? " + " : "") + `${allocation.singleRooms} مفردة`;
  if (!roomConfigText) roomConfigText = "لا يوجد";

  // City distribution (default for Georgia trip)
  const cityStays: CityStay[] = getCityDistribution(totalNights);

  // Calculate car cost
  const carDailyRate = getCarDailyRate(totalPax, carPricing);
  const carCost = carDailyRate * totalDays;

  // Calculate SIM card cost
  const simCost = totalPax > settings.freeSimCardsAllowance 
    ? (totalPax - settings.freeSimCardsAllowance) * settings.simCardPrice 
    : 0;

  // Offer tier labels
  const tierLabels = [
    "💎 العرض الأول (اقتصادي مميز)",
    "💎 العرض الثاني (ستاندرد)",
    "💎 العرض الثالث (متوسط)",
    "💎 العرض الرابع (ديلوكس)",
    "💎 العرض الخامس (فاخر جداً)",
  ];

  // Generate offers
  const offerBlocks: string[] = [];

  for (let i = 0; i < 5; i++) {
    const hotelOffers = tierOffers[i];
    
    // Calculate hotel costs for both view options
    const hotelCostNoView = calculateHotelCost(cityStays, allocation, hotelOffers, false);
    const hotelCostWithView = calculateHotelCost(cityStays, allocation, hotelOffers, true);

    // Initial costs
    const initialCostNoView = hotelCostNoView + carCost + simCost;
    const initialCostWithView = hotelCostWithView + carCost + simCost;

    // Apply profit margin
    const withProfitNoView = initialCostNoView * (1 + settings.profitMargin / 100);
    const withProfitWithView = initialCostWithView * (1 + settings.profitMargin / 100);

    // Convert to SAR and round
    const finalPriceNoView = roundToNearest10(withProfitNoView * settings.exchangeRateUsdToSar);
    const finalPriceWithView = roundToNearest10(withProfitWithView * settings.exchangeRateUsdToSar);

    // Format USD prices for display
    const usdNoView = roundToNearest10(withProfitNoView);
    const usdWithView = roundToNearest10(withProfitWithView);

    // Build hotel list
    const hotelList = cityStays.map(stay => {
      const hotel = hotelOffers.find(h => h.city.toLowerCase() === stay.city.toLowerCase());
      const cityNameAr = getCityNameArabic(stay.city);
      return `• ${cityNameAr} (${stay.nights} ليالي): ${hotel?.hotelName || "فندق محلي مميز"}`;
    }).join("\n");

    offerBlocks.push(
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `${tierLabels[i]}:\n` +
      `💵 السعر بدون إطلالة: ${finalPriceNoView} ر.س ($${usdNoView})\n` +
      `🖼️ السعر مع إطلالة: ${finalPriceWithView} ر.س ($${usdWithView})\n` +
      `🏨 الفنادق وتوزيع الليالي:\n` +
      hotelList
    );
  }

  // Car only offer
  const carOnlyInitial = carCost + simCost;
  const carOnlyWithProfit = carOnlyInitial * (1 + settings.profitMargin / 100);
  const carOnlyFinal = roundToNearest10(carOnlyWithProfit * settings.exchangeRateUsdToSar);
  const carOnlyUsd = roundToNearest10(carOnlyWithProfit);

  const carOnlyBlock = 
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🚗 عرض سيارة فقط (بدون إقامة): ${carOnlyFinal} ر.س ($${carOnlyUsd})\n` +
    `يشمل: سيارة مع سائق لمدة ${totalDays} أيام، خطوط اتصال، وتأمين شامل.`;

  // Included services
  const servicesBlock = 
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `✅ الخدمات المشمولة في العروض الفندقية:\n` +
    `• استقبال وتوديع من وإلى المطار.\n` +
    `• سيارة خاصة مع سائق طوال فترة الرحلة.\n` +
    `• إفطار يومي في الفنادق.\n` +
    `• شرائح اتصال مع إنترنت.\n` +
    `• تأمين سفر شامل.`;

  // Build final message
  const childrenTotal = req.childrenOver6 + req.childrenUnder6;
  
  const message = 
    `🌟 عروض عالم الفخامة - جورجيا 🌟\n` +
    `📋 ملخص الطلب:\n` +
    `• المدة: ${totalDays} أيام (${totalNights} ليالي)\n` +
    `• البالغين: ${req.adults} | الأطفال: ${childrenTotal}\n` +
    `• تكوين الغرف: ${allocation.totalRooms} غرفة (${roomConfigText})\n\n` +
    offerBlocks.join("\n\n") + "\n\n" +
    carOnlyBlock + "\n\n" +
    servicesBlock;

  return message;
}

// ============================================================================
// CITY DISTRIBUTION HELPER
// ============================================================================

function getCityDistribution(totalNights: number): CityStay[] {
  // Default Georgia trip distribution
  if (totalNights <= 3) {
    return [{ city: "Tbilisi", nights: totalNights }];
  } else if (totalNights <= 5) {
    return [
      { city: "Tbilisi", nights: 2 },
      { city: "Batumi", nights: totalNights - 2 },
    ];
  } else if (totalNights <= 7) {
    return [
      { city: "Tbilisi", nights: 2 },
      { city: "Gudauri", nights: 1 },
      { city: "Batumi", nights: totalNights - 3 },
    ];
  } else if (totalNights <= 10) {
    return [
      { city: "Tbilisi", nights: 2 },
      { city: "Gudauri", nights: 1 },
      { city: "Borjomi", nights: 1 },
      { city: "Batumi", nights: totalNights - 4 },
    ];
  } else {
    // 11+ nights
    return [
      { city: "Tbilisi", nights: 3 },
      { city: "Gudauri", nights: 2 },
      { city: "Borjomi", nights: 1 },
      { city: "Bakuriani", nights: 2 },
      { city: "Batumi", nights: totalNights - 8 },
    ];
  }
}

function getCityNameArabic(cityEn: string): string {
  const cityNames: Record<string, string> = {
    "Tbilisi": "تبليسي",
    "Batumi": "باتومي",
    "Kutaisi": "كوتايسي",
    "Borjomi": "بورجومي",
    "Gudauri": "غوداوري",
    "Bakuriani": "باكورياني",
    "Dashbash": "داشباش",
  };
  return cityNames[cityEn] || cityEn;
}

// ============================================================================
// TELEGRAM API HELPERS
// ============================================================================

async function sendTelegram(token: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      chat_id: chatId, 
      text,
      parse_mode: "HTML" 
    }),
  });
}

async function sendTelegramWithKeyboard(token: string, chatId: number, text: string) {
  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: "📋 نسخ / إرسال العرض للعميل",
          switch_inline_query: text.substring(0, 256), // Telegram limit for inline query
        }
      ],
      [
        {
          text: "↗️ إعادة توجيه العرض",
          callback_data: "forward_quote"
        }
      ]
    ]
  };

  // First send the main message
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      chat_id: chatId, 
      text,
      reply_markup: inlineKeyboard,
    }),
  });

  // Also send a separate forwardable message without buttons
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      chat_id: chatId, 
      text: "⬆️ قم بإعادة توجيه الرسالة أعلاه للعميل مباشرة",
    }),
  });
}

async function answerCallbackQuery(token: string, callbackQueryId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      callback_query_id: callbackQueryId,
      text,
      show_alert: false,
    }),
  });
}
