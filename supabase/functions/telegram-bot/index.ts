import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TripRequest {
  arrival_date: string;
  departure_date: string;
  arrival_airport: string;
  departure_airport?: string;
  adults: number;
  children: number;
  rooms: number;
  room_type: "single" | "double" | "triple";
  view_preference: boolean;
}

function getCarType(totalPax: number): string {
  if (totalPax <= 3) return "sedan";
  if (totalPax <= 6) return "minivan";
  if (totalPax === 7) return "van";
  return "sprinter";
}

function daysBetween(d1: string, d2: string): number {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return Math.ceil((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}

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
        await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, 
          "🏨 مرحباً بك في نظام عالم الفخامة - جورجيا\n\n" +
          "أرسل طلب عرض سعر بالصيغة التالية:\n\n" +
          "/quote تاريخ_الوصول تاريخ_المغادرة مطار_الوصول بالغين أطفال غرف نوع_الغرفة إطلالة\n\n" +
          "مثال:\n/quote 2026-07-01 2026-07-08 TBS 2 1 1 double yes\n\n" +
          "أنواع الغرف: single / double / triple\n" +
          "إطلالة: yes / no\n" +
          "المطارات: TBS / KUT / BUS"
        );
        return new Response("OK", { headers: corsHeaders });
      }

      if (text.startsWith("/quote")) {
        const parts = text.split(" ").slice(1);
        if (parts.length < 8) {
          await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId,
            "❌ صيغة غير صحيحة. استخدم:\n/quote تاريخ_وصول تاريخ_مغادرة مطار بالغين أطفال غرف نوع_غرفة إطلالة\n\nمثال: /quote 2026-07-01 2026-07-08 TBS 2 1 1 double yes"
          );
          return new Response("OK", { headers: corsHeaders });
        }

        const request: TripRequest = {
          arrival_date: parts[0],
          departure_date: parts[1],
          arrival_airport: parts[2].toUpperCase(),
          adults: parseInt(parts[3]),
          children: parseInt(parts[4]),
          rooms: parseInt(parts[5]),
          room_type: parts[6] as any,
          view_preference: parts[7]?.toLowerCase() === "yes",
        };

        const quote = await calculateQuote(supabase, request);
        await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, quote);
        return new Response("OK", { headers: corsHeaders });
      }

      await sendTelegram(TELEGRAM_BOT_TOKEN!, chatId, "أرسل /start للبدء أو /quote لطلب عرض سعر");
      return new Response("OK", { headers: corsHeaders });
    }

    // Handle direct API call for quote calculation
    if (body.action === "calculate") {
      const quote = await calculateQuote(supabase, body.request);
      return new Response(JSON.stringify({ quote }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

async function calculateQuote(supabase: any, req: TripRequest): Promise<string> {
  const totalDays = daysBetween(req.arrival_date, req.departure_date);
  const totalNights = totalDays;
  const totalPax = req.adults + req.children;
  const carType = getCarType(totalPax);

  // Fetch all needed data
  const [settingsRes, servicesRes, carsRes, airportsRes, transfersRes, routesRes, hotelsRes, citiesRes] = await Promise.all([
    supabase.from("system_settings").select("*").single(),
    supabase.from("mandatory_services").select("*").single(),
    supabase.from("cars").select("*").eq("car_type", carType).single(),
    supabase.from("airports").select("*"),
    supabase.from("airport_transfers").select("*").eq("car_type", carType),
    supabase.from("city_routes").select("*, cities(name_ar, supports_view)").eq("total_nights", totalNights).order("route_order"),
    supabase.from("hotels").select("*, cities(name_ar, supports_view)").eq("is_active", true).order("tier"),
    supabase.from("cities").select("*").order("sort_order"),
  ]);

  const settings = settingsRes.data;
  const services = servicesRes.data;
  const car = carsRes.data;
  const airports = airportsRes.data || [];
  const transfers = transfersRes.data || [];
  const routes = routesRes.data || [];
  const hotels = hotelsRes.data || [];
  const cities = citiesRes.data || [];
  const profitMargin = settings?.profit_margin ?? 15;
  const season = settings?.active_season ?? "high";

  // Car price per day based on season
  const carPricePerDay = car ? (season === "high" ? car.price_per_day_high : season === "mid" ? car.price_per_day_mid : car.price_per_day_low) : 0;
  const totalCarCost = carPricePerDay * totalDays;

  // Airport transfer costs
  const arrivalAirport = airports.find((a: any) => a.code === req.arrival_airport);
  const depAirport = airports.find((a: any) => a.code === (req.departure_airport || req.arrival_airport));
  const arrivalTransfer = transfers.find((t: any) => t.airport_id === arrivalAirport?.id);
  const departureTransfer = transfers.find((t: any) => t.airport_id === depAirport?.id);
  const transferCost = (arrivalTransfer?.price ?? 0) + (departureTransfer?.price ?? 0);

  // Mandatory services
  const simCost = (services?.sim_card_price ?? 15) * totalPax;
  const insuranceCost = (services?.insurance_price_per_day_per_pax ?? 5) * totalDays * totalPax;

  // Determine route
  let cityDistribution = routes;
  if (cityDistribution.length === 0) {
    // Fallback: distribute evenly across first 2 cities
    const c1 = cities[0];
    const c2 = cities[1];
    if (c1 && c2) {
      const n1 = Math.ceil(totalNights / 2);
      const n2 = totalNights - n1;
      cityDistribution = [
        { city_id: c1.id, cities: c1, nights_in_city: n1, route_order: 1 },
        { city_id: c2.id, cities: c2, nights_in_city: n2, route_order: 2 },
      ];
    } else if (c1) {
      cityDistribution = [{ city_id: c1.id, cities: c1, nights_in_city: totalNights, route_order: 1 }];
    }
  }

  // Get hotel price based on room type and view
  const getHotelPrice = (hotel: any, wantView: boolean): number => {
    const citySupportsView = hotel.cities?.supports_view;
    const useView = wantView && citySupportsView;
    
    switch (req.room_type) {
      case "single": return useView ? (hotel.price_single_view ?? hotel.price_single) : hotel.price_single;
      case "double": return useView ? (hotel.price_double_view ?? hotel.price_double) : hotel.price_double;
      case "triple": return useView ? (hotel.price_triple_view ?? hotel.price_triple) : hotel.price_triple;
      default: return hotel.price_double;
    }
  };

  // Group hotels by tier
  const tiers = ["economy", "standard", "superior", "deluxe", "luxury"];
  const roomTypeAr: Record<string, string> = { single: "مفرد", double: "مزدوج", triple: "ثلاثي" };
  const viewPrefAr = req.view_preference ? "مع إطلالة" : "بدون إطلالة";

  // Generate 5 offers
  const offers: string[] = [];
  const offerLabels = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس"];

  for (let tierIdx = 0; tierIdx < tiers.length; tierIdx++) {
    const tier = tiers[tierIdx];
    let hotelNightsCost = 0;
    const cityHotels: string[] = [];
    const nightsDist: string[] = [];

    for (const route of cityDistribution) {
      const cityHotel = hotels.find((h: any) => h.city_id === route.city_id && h.tier === tier);
      if (cityHotel) {
        const pricePerNight = getHotelPrice(cityHotel, req.view_preference) * req.rooms;
        hotelNightsCost += pricePerNight * route.nights_in_city;
        cityHotels.push(`• ${route.cities?.name_ar}: ${cityHotel.name_ar}`);
        nightsDist.push(`• ${route.cities?.name_ar}: ${route.nights_in_city} ليالي`);
      } else {
        // Fallback: use any hotel of same tier or nearest tier
        const fallback = hotels.find((h: any) => h.city_id === route.city_id);
        if (fallback) {
          const pricePerNight = getHotelPrice(fallback, req.view_preference) * req.rooms;
          hotelNightsCost += pricePerNight * route.nights_in_city;
          cityHotels.push(`• ${route.cities?.name_ar}: ${fallback.name_ar}`);
          nightsDist.push(`• ${route.cities?.name_ar}: ${route.nights_in_city} ليالي`);
        }
      }
    }

    const baseCost = hotelNightsCost + totalCarCost + transferCost + simCost + insuranceCost;
    const finalPrice = Math.ceil(baseCost * (1 + profitMargin / 100));

    offers.push(
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `العرض ${tierIdx + 1} (${offerLabels[tierIdx]}) : $${finalPrice}\n` +
      `توزيع الليالي:\n${nightsDist.join("\n")}\n` +
      `الفنادق :\n${cityHotels.join("\n")}`
    );
  }

  // Car only offer
  const carOnlyBase = totalCarCost + transferCost + simCost + insuranceCost;
  const carOnlyPrice = Math.ceil(carOnlyBase * (1 + profitMargin / 100));

  const carOnlyOffer = 
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `عرض سيارة فقط : $${carOnlyPrice}\n` +
    `يشمل:\n` +
    `• سيارة مع سائق لمدة ${totalDays} أيام\n` +
    `• خط اتصال\n` +
    `• تأمين شامل\n` +
    `• لا يشمل الإقامة`;

  // Build final message
  const message = 
    `🌟 عروض رحلات جورجيا المميزة 🌟\n\n` +
    `ملخص الطلب:\n` +
    `• المدة: ${totalDays} أيام (${totalNights} ليالي)\n` +
    `• البالغين: ${req.adults}\n` +
    `• الأطفال: ${req.children}\n` +
    `• تكوين الغرف: ${req.rooms} ${roomTypeAr[req.room_type]}\n` +
    `• نوع الإطلالة: ${viewPrefAr}\n\n` +
    offers.join("\n\n") + "\n\n" +
    carOnlyOffer;

  return message;
}

async function sendTelegram(token: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}
