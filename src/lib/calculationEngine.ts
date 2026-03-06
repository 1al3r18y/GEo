/**
 * ============================================================================
 * LUXURY WORLD (عالم الفخامة) - Quotation Calculation Engine
 * ============================================================================
 * 
 * This module implements the complete pricing calculation logic for travel
 * quotations, including:
 * - Hotel costs based on room allocation and offer tiers
 * - Car costs based on total passengers
 * - Service costs (SIM cards with free allowance)
 * - Profit margin application
 * - Currency conversion
 * - Final price rounding
 * 
 * All rates and margins are dynamically fetched from the database.
 * 
 * @module CalculationEngine
 * @version 1.0.0
 * @date March 6, 2026
 */

import { supabase } from "@/integrations/supabase/client";
import { 
  allocateRoomsForPassengers, 
  calculateTotalPax,
  type PassengerInput,
  type RoomAllocation 
} from "./roomAllocation";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type OfferTier = "tier_1" | "tier_2" | "tier_3" | "tier_4" | "tier_5";
export type RoomType = "double" | "triple";
export type ViewPreference = "view" | "no_view";

export interface CityStay {
  city: string;
  nights: number;
  viewPreference: ViewPreference;
}

export interface QuotationInput {
  passengers: PassengerInput;
  offerTier: OfferTier;
  cityStays: CityStay[];
  totalDays: number;
}

export interface SystemSettings {
  profitMargin: number;          // e.g., 22 for 22%
  exchangeRateUsdToSar: number;  // e.g., 3.8
  freeSimCardsAllowance: number; // e.g., 2
  simCardPrice: number;          // e.g., 15 USD
}

export interface HotelOffer {
  city: string;
  hotelName: string;
  dblView: number;
  dblNoView: number;
  trblView: number;
  trblNoView: number;
}

export interface CarPricing {
  minPax: number;
  maxPax: number;
  pricePerDay: number;
}

export interface CostBreakdown {
  hotelCost: number;
  carCost: number;
  servicesCost: number;
  initialCost: number;
  profitMarginPercent: number;
  costWithProfit: number;
  exchangeRate: number;
  convertedPrice: number;
  finalPrice: number;
  currency: string;
  roomAllocation: RoomAllocation;
  totalPax: number;
  effectivePax: number;
}

// ============================================================================
// DATA FETCHING FUNCTIONS
// ============================================================================

/**
 * Fetches system settings and mandatory services from database
 */
export async function fetchSystemSettings(): Promise<SystemSettings> {
  const [settingsResult, servicesResult] = await Promise.all([
    supabase.from("system_settings").select("*").single(),
    supabase.from("mandatory_services").select("*").single(),
  ]);

  if (settingsResult.error) throw new Error(`Settings fetch failed: ${settingsResult.error.message}`);
  if (servicesResult.error) throw new Error(`Services fetch failed: ${servicesResult.error.message}`);

  return {
    profitMargin: settingsResult.data.profit_margin ?? 22,
    exchangeRateUsdToSar: settingsResult.data.exchange_rate_usd_to_sar ?? 3.8,
    freeSimCardsAllowance: settingsResult.data.free_sim_cards_allowance ?? 2,
    simCardPrice: servicesResult.data.sim_card_price ?? 15,
  };
}

/**
 * Fetches hotel offers for a specific tier
 */
export async function fetchHotelOffers(tier: OfferTier): Promise<HotelOffer[]> {
  const { data, error } = await supabase
    .from("hotel_offers")
    .select("*")
    .eq("offer_tier", tier)
    .eq("is_active", true);

  if (error) throw new Error(`Hotel offers fetch failed: ${error.message}`);

  return (data ?? []).map((h) => ({
    city: h.city,
    hotelName: h.hotel_name,
    dblView: h.dbl_view,
    dblNoView: h.dbl_no_view,
    trblView: h.trbl_view,
    trblNoView: h.trbl_no_view,
  }));
}

/**
 * Fetches car pricing tiers from database
 */
export async function fetchCarPricing(): Promise<CarPricing[]> {
  const { data, error } = await supabase
    .from("car_pricing")
    .select("*")
    .eq("is_active", true)
    .order("min_pax");

  if (error) throw new Error(`Car pricing fetch failed: ${error.message}`);

  return (data ?? []).map((c) => ({
    minPax: c.min_pax,
    maxPax: c.max_pax,
    pricePerDay: c.price_per_day,
  }));
}

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Gets the car price per day based on total passengers
 * 
 * @param totalPax - Total number of passengers (adults + all children)
 * @param carPricing - Array of car pricing tiers
 * @returns Daily car rate in USD
 */
export function getCarDailyRate(totalPax: number, carPricing: CarPricing[]): number {
  const tier = carPricing.find(c => totalPax >= c.minPax && totalPax <= c.maxPax);
  
  if (!tier) {
    // If pax exceeds max tier, use the highest tier
    const maxTier = carPricing.reduce((max, c) => c.maxPax > max.maxPax ? c : max, carPricing[0]);
    return maxTier?.pricePerDay ?? 0;
  }
  
  return tier.pricePerDay;
}

/**
 * Calculates hotel cost for a single city stay
 * 
 * @param cityStay - City stay details
 * @param allocation - Room allocation
 * @param hotelOffer - Hotel pricing for this city
 * @returns Total hotel cost for this city in USD
 */
export function calculateCityHotelCost(
  cityStay: CityStay,
  allocation: RoomAllocation,
  hotelOffer: HotelOffer
): number {
  const isView = cityStay.viewPreference === "view";
  
  // Get room prices based on view preference
  const doublePrice = isView ? hotelOffer.dblView : hotelOffer.dblNoView;
  const triplePrice = isView ? hotelOffer.trblView : hotelOffer.trblNoView;
  
  // Calculate cost per night
  const costPerNight = 
    (allocation.tripleRooms * triplePrice) + 
    (allocation.doubleRooms * doublePrice) +
    (allocation.singleRooms * doublePrice); // Single rooms use double room price
  
  return costPerNight * cityStay.nights;
}

/**
 * Calculates total hotel cost across all cities
 */
export function calculateTotalHotelCost(
  cityStays: CityStay[],
  allocation: RoomAllocation,
  hotelOffers: HotelOffer[]
): number {
  let totalCost = 0;
  
  for (const stay of cityStays) {
    const hotelOffer = hotelOffers.find(
      h => h.city.toLowerCase() === stay.city.toLowerCase()
    );
    
    if (hotelOffer) {
      totalCost += calculateCityHotelCost(stay, allocation, hotelOffer);
    } else {
      console.warn(`No hotel offer found for city: ${stay.city}`);
    }
  }
  
  return totalCost;
}

/**
 * Calculates car cost
 * 
 * Formula: Daily Rate × Total Days
 */
export function calculateCarCost(
  totalPax: number,
  totalDays: number,
  carPricing: CarPricing[]
): number {
  const dailyRate = getCarDailyRate(totalPax, carPricing);
  return dailyRate * totalDays;
}

/**
 * Calculates SIM card cost
 * 
 * Formula: (Total Pax - Free SIMs) × SIM Price
 * Only applies if Total Pax > Free SIM Allowance
 */
export function calculateSimCardCost(
  totalPax: number,
  freeSimAllowance: number,
  simCardPrice: number
): number {
  if (totalPax <= freeSimAllowance) {
    return 0;
  }
  
  const chargeableSims = totalPax - freeSimAllowance;
  return chargeableSims * simCardPrice;
}

/**
 * Applies profit margin to cost
 * 
 * Formula: Initial Cost × (1 + Margin/100)
 * e.g., 22% margin: cost × 1.22
 */
export function applyProfitMargin(cost: number, marginPercent: number): number {
  return cost * (1 + marginPercent / 100);
}

/**
 * Converts price to target currency
 */
export function convertCurrency(priceUsd: number, exchangeRate: number): number {
  return priceUsd * exchangeRate;
}

/**
 * Rounds price to nearest 10
 * 
 * Formula: Math.round(price / 10) × 10
 */
export function roundToNearest10(price: number): number {
  return Math.round(price / 10) * 10;
}

// ============================================================================
// MAIN CALCULATION ENGINE
// ============================================================================

/**
 * Main Quotation Calculation Engine
 * 
 * Executes the complete pricing calculation following these steps:
 * 1. Calculate room allocation based on effective pax
 * 2. Calculate hotel cost based on allocation, tier, and view preference
 * 3. Calculate car cost based on total pax and days
 * 4. Calculate services cost (SIM cards with free allowance)
 * 5. Sum to get initial cost
 * 6. Apply dynamic profit margin
 * 7. Convert to target currency
 * 8. Round to nearest 10
 * 
 * @param input - Quotation input parameters
 * @returns Complete cost breakdown
 */
export async function calculateQuotation(input: QuotationInput): Promise<CostBreakdown> {
  // Step 1: Fetch all dynamic settings from database
  const [settings, hotelOffers, carPricing] = await Promise.all([
    fetchSystemSettings(),
    fetchHotelOffers(input.offerTier),
    fetchCarPricing(),
  ]);

  // Step 2: Calculate room allocation
  const allocation = allocateRoomsForPassengers(input.passengers);
  const totalPax = calculateTotalPax(input.passengers);

  // Step 3: Calculate hotel cost
  const hotelCost = calculateTotalHotelCost(input.cityStays, allocation, hotelOffers);

  // Step 4: Calculate car cost
  const carCost = calculateCarCost(totalPax, input.totalDays, carPricing);

  // Step 5: Calculate services cost
  const servicesCost = calculateSimCardCost(
    totalPax,
    settings.freeSimCardsAllowance,
    settings.simCardPrice
  );

  // Step 6: Calculate initial cost
  const initialCost = hotelCost + carCost + servicesCost;

  // Step 7: Apply profit margin
  const costWithProfit = applyProfitMargin(initialCost, settings.profitMargin);

  // Step 8: Convert currency
  const convertedPrice = convertCurrency(costWithProfit, settings.exchangeRateUsdToSar);

  // Step 9: Round to nearest 10
  const finalPrice = roundToNearest10(convertedPrice);

  return {
    hotelCost,
    carCost,
    servicesCost,
    initialCost,
    profitMarginPercent: settings.profitMargin,
    costWithProfit,
    exchangeRate: settings.exchangeRateUsdToSar,
    convertedPrice,
    finalPrice,
    currency: "SAR",
    roomAllocation: allocation,
    totalPax,
    effectivePax: allocation.effectivePax,
  };
}

/**
 * Synchronous calculation engine (for testing/preview without DB)
 * Uses provided settings instead of fetching from database
 */
export function calculateQuotationSync(
  input: QuotationInput,
  settings: SystemSettings,
  hotelOffers: HotelOffer[],
  carPricing: CarPricing[]
): CostBreakdown {
  // Calculate room allocation
  const allocation = allocateRoomsForPassengers(input.passengers);
  const totalPax = calculateTotalPax(input.passengers);

  // Calculate costs
  const hotelCost = calculateTotalHotelCost(input.cityStays, allocation, hotelOffers);
  const carCost = calculateCarCost(totalPax, input.totalDays, carPricing);
  const servicesCost = calculateSimCardCost(
    totalPax,
    settings.freeSimCardsAllowance,
    settings.simCardPrice
  );

  const initialCost = hotelCost + carCost + servicesCost;
  const costWithProfit = applyProfitMargin(initialCost, settings.profitMargin);
  const convertedPrice = convertCurrency(costWithProfit, settings.exchangeRateUsdToSar);
  const finalPrice = roundToNearest10(convertedPrice);

  return {
    hotelCost,
    carCost,
    servicesCost,
    initialCost,
    profitMarginPercent: settings.profitMargin,
    costWithProfit,
    exchangeRate: settings.exchangeRateUsdToSar,
    convertedPrice,
    finalPrice,
    currency: "SAR",
    roomAllocation: allocation,
    totalPax,
    effectivePax: allocation.effectivePax,
  };
}
