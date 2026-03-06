/**
 * ============================================================================
 * LUXURY WORLD - Room Allocation & Calculation Engine Tests
 * ============================================================================
 * 
 * Unit tests for verifying the correctness of:
 * - Smart Room Allocation Algorithm
 * - Calculation Engine formulas
 * 
 * @version 1.0.0
 * @date March 6, 2026
 */

import { describe, it, expect } from "vitest";
import {
  calculateEffectivePax,
  calculateTotalPax,
  allocateRooms,
  allocateRoomsForPassengers,
  validateAllocation,
  type PassengerInput,
} from "../lib/roomAllocation";
import {
  getCarDailyRate,
  calculateSimCardCost,
  applyProfitMargin,
  convertCurrency,
  roundToNearest10,
  calculateQuotationSync,
  type CarPricing,
  type SystemSettings,
  type HotelOffer,
} from "../lib/calculationEngine";

// ============================================================================
// ROOM ALLOCATION TESTS
// ============================================================================

describe("Room Allocation Engine", () => {
  describe("calculateEffectivePax", () => {
    it("should count adults and children over 6", () => {
      const input: PassengerInput = { adults: 2, childrenOver6: 1, childrenUnder6: 2 };
      expect(calculateEffectivePax(input)).toBe(3);
    });

    it("should not count children under 6", () => {
      const input: PassengerInput = { adults: 2, childrenOver6: 0, childrenUnder6: 3 };
      expect(calculateEffectivePax(input)).toBe(2);
    });
  });

  describe("calculateTotalPax", () => {
    it("should count all passengers", () => {
      const input: PassengerInput = { adults: 2, childrenOver6: 1, childrenUnder6: 2 };
      expect(calculateTotalPax(input)).toBe(5);
    });
  });

  describe("allocateRooms", () => {
    it("should return empty allocation for 0 pax", () => {
      const result = allocateRooms(0);
      expect(result.totalRooms).toBe(0);
    });

    it("should allocate 1 triple for 3 pax", () => {
      const result = allocateRooms(3);
      expect(result.tripleRooms).toBe(1);
      expect(result.doubleRooms).toBe(0);
      expect(result.singleRooms).toBe(0);
      expect(result.totalRooms).toBe(1);
    });

    it("should allocate 1 triple + 1 double for 5 pax", () => {
      const result = allocateRooms(5);
      expect(result.tripleRooms).toBe(1);
      expect(result.doubleRooms).toBe(1);
      expect(result.singleRooms).toBe(0);
      expect(result.totalRooms).toBe(2);
    });

    it("should allocate 2 triples for 6 pax", () => {
      const result = allocateRooms(6);
      expect(result.tripleRooms).toBe(2);
      expect(result.doubleRooms).toBe(0);
      expect(result.singleRooms).toBe(0);
      expect(result.totalRooms).toBe(2);
    });

    it("should allocate 2 doubles for 4 pax (convert from 1 triple + 1 remaining)", () => {
      const result = allocateRooms(4);
      // 4 pax: 1 triple (3) + 1 remaining
      // Convert: 0 triples + 2 doubles = 4 people housed
      expect(result.tripleRooms).toBe(0);
      expect(result.doubleRooms).toBe(2);
      expect(result.singleRooms).toBe(0);
      expect(result.totalRooms).toBe(2);
    });

    it("should allocate 2 triples + 1 single for 7 pax", () => {
      const result = allocateRooms(7);
      // 7 pax: 2 triples (6) + 1 remaining
      // 1 remaining with triples available: convert 1 triple to 2 doubles
      // Result: 1 triple + 2 doubles = 7 people
      expect(result.tripleRooms).toBe(1);
      expect(result.doubleRooms).toBe(2);
      expect(result.singleRooms).toBe(0);
      expect(result.totalRooms).toBe(3);
    });

    it("should allocate 3 triples for 9 pax", () => {
      const result = allocateRooms(9);
      expect(result.tripleRooms).toBe(3);
      expect(result.doubleRooms).toBe(0);
      expect(result.singleRooms).toBe(0);
      expect(result.totalRooms).toBe(3);
    });

    it("should use single room when no triples to convert for 1 pax", () => {
      const result = allocateRooms(1);
      expect(result.tripleRooms).toBe(0);
      expect(result.doubleRooms).toBe(0);
      expect(result.singleRooms).toBe(1);
      expect(result.totalRooms).toBe(1);
    });

    it("should allocate 1 double for 2 pax", () => {
      const result = allocateRooms(2);
      expect(result.tripleRooms).toBe(0);
      expect(result.doubleRooms).toBe(1);
      expect(result.singleRooms).toBe(0);
      expect(result.totalRooms).toBe(1);
    });
  });

  describe("validateAllocation", () => {
    it("should validate correct allocation", () => {
      const allocation = allocateRooms(5);
      expect(validateAllocation(allocation)).toBe(true);
    });
  });
});

// ============================================================================
// CALCULATION ENGINE TESTS
// ============================================================================

describe("Calculation Engine", () => {
  const mockCarPricing: CarPricing[] = [
    { minPax: 1, maxPax: 3, pricePerDay: 100 },
    { minPax: 4, maxPax: 6, pricePerDay: 120 },
    { minPax: 7, maxPax: 8, pricePerDay: 160 },
    { minPax: 9, maxPax: 12, pricePerDay: 250 },
    { minPax: 13, maxPax: 24, pricePerDay: 550 },
    { minPax: 25, maxPax: 45, pricePerDay: 700 },
  ];

  describe("getCarDailyRate", () => {
    it("should return $100 for 1-3 pax", () => {
      expect(getCarDailyRate(1, mockCarPricing)).toBe(100);
      expect(getCarDailyRate(3, mockCarPricing)).toBe(100);
    });

    it("should return $120 for 4-6 pax", () => {
      expect(getCarDailyRate(4, mockCarPricing)).toBe(120);
      expect(getCarDailyRate(6, mockCarPricing)).toBe(120);
    });

    it("should return $160 for 7-8 pax", () => {
      expect(getCarDailyRate(7, mockCarPricing)).toBe(160);
      expect(getCarDailyRate(8, mockCarPricing)).toBe(160);
    });

    it("should return $250 for 9-12 pax", () => {
      expect(getCarDailyRate(9, mockCarPricing)).toBe(250);
      expect(getCarDailyRate(12, mockCarPricing)).toBe(250);
    });

    it("should return $550 for 13-24 pax", () => {
      expect(getCarDailyRate(13, mockCarPricing)).toBe(550);
      expect(getCarDailyRate(24, mockCarPricing)).toBe(550);
    });

    it("should return $700 for 25-45 pax", () => {
      expect(getCarDailyRate(25, mockCarPricing)).toBe(700);
      expect(getCarDailyRate(45, mockCarPricing)).toBe(700);
    });
  });

  describe("calculateSimCardCost", () => {
    it("should return 0 when pax <= free allowance", () => {
      expect(calculateSimCardCost(2, 2, 15)).toBe(0);
      expect(calculateSimCardCost(1, 2, 15)).toBe(0);
    });

    it("should charge for pax exceeding free allowance", () => {
      // 5 pax, 2 free, $15 each = (5-2) * 15 = $45
      expect(calculateSimCardCost(5, 2, 15)).toBe(45);
    });

    it("should charge correctly for 10 pax with 2 free SIMs", () => {
      // (10-2) * 15 = $120
      expect(calculateSimCardCost(10, 2, 15)).toBe(120);
    });
  });

  describe("applyProfitMargin", () => {
    it("should apply 22% margin correctly", () => {
      expect(applyProfitMargin(100, 22)).toBe(122);
      expect(applyProfitMargin(1000, 22)).toBe(1220);
    });

    it("should apply 0% margin", () => {
      expect(applyProfitMargin(100, 0)).toBe(100);
    });
  });

  describe("convertCurrency", () => {
    it("should convert USD to SAR at 3.8 rate", () => {
      expect(convertCurrency(100, 3.8)).toBe(380);
      expect(convertCurrency(1000, 3.8)).toBe(3800);
    });
  });

  describe("roundToNearest10", () => {
    it("should round to nearest 10", () => {
      expect(roundToNearest10(123)).toBe(120);
      expect(roundToNearest10(125)).toBe(130);
      expect(roundToNearest10(127)).toBe(130);
      expect(roundToNearest10(3847)).toBe(3850);
    });
  });

  describe("Full Quotation Calculation", () => {
    const mockSettings: SystemSettings = {
      profitMargin: 22,
      exchangeRateUsdToSar: 3.8,
      freeSimCardsAllowance: 2,
      simCardPrice: 15,
    };

    const mockHotelOffers: HotelOffer[] = [
      { city: "Tbilisi", hotelName: "Test Hotel", dblView: 90, dblNoView: 80, trblView: 130, trblNoView: 120 },
      { city: "Batumi", hotelName: "Beach Hotel", dblView: 120, dblNoView: 110, trblView: 175, trblNoView: 165 },
    ];

    it("should calculate complete quotation correctly", () => {
      const result = calculateQuotationSync(
        {
          passengers: { adults: 3, childrenOver6: 1, childrenUnder6: 1 },
          offerTier: "tier_1",
          cityStays: [
            { city: "Tbilisi", nights: 3, viewPreference: "view" },
            { city: "Batumi", nights: 2, viewPreference: "no_view" },
          ],
          totalDays: 5,
        },
        mockSettings,
        mockHotelOffers,
        mockCarPricing
      );

      // Effective pax: 3 + 1 = 4 (1 triple + conversion = 2 doubles)
      expect(result.effectivePax).toBe(4);
      
      // Total pax: 3 + 1 + 1 = 5
      expect(result.totalPax).toBe(5);
      
      // Car cost: 5 pax = $120/day * 5 days = $600
      expect(result.carCost).toBe(600);
      
      // SIM cost: (5 - 2) * $15 = $45
      expect(result.servicesCost).toBe(45);
      
      // Profit margin should be 22%
      expect(result.profitMarginPercent).toBe(22);
      
      // Currency should be SAR
      expect(result.currency).toBe("SAR");
      
      // Final price should be rounded to nearest 10
      expect(result.finalPrice % 10).toBe(0);
    });
  });
});
