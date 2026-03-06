/**
 * ============================================================================
 * LUXURY WORLD (عالم الفخامة) - Smart Room Allocation Engine
 * ============================================================================
 * 
 * AGE-BASED OCCUPANCY RULES:
 * - Children ≤ 6 years: COMPLETELY FREE (ignored in rooms & car)
 * - Children > 6 years: Counted as FULL ADULT
 * - Effective Pax = Adults + (Children > 6)
 * 
 * STRICT ROOM ALLOCATION MAPPING:
 * - 1 Pax = 1 Single (billed at DBL/SGL price)
 * - 2 Pax = 1 Double
 * - 3 Pax = 1 Triple
 * - 4 Pax = 2 Doubles
 * - 5 Pax = 1 Double + 1 Triple
 * - 6 Pax = 2 Triples
 * - Priority: Triple rooms to minimize total rooms
 * 
 * @module SmartRoomAllocation
 * @version 2.0.0
 * @date March 6, 2026
 */

export interface RoomAllocation {
  singleRooms: number;
  doubleRooms: number;
  tripleRooms: number;
  totalRooms: number;
  effectivePax: number;
}

export interface PassengerInput {
  adults: number;
  childrenOver6: number;  // Children > 6 years old count as full adult
  childrenUnder6: number; // Children <= 6 years old = COMPLETELY FREE
}

/**
 * Calculates the effective number of passengers for room & car allocation.
 * 
 * Formula: Effective Pax = Adults + (Children > 6)
 * 
 * Children 6 years old or under are COMPLETELY FREE:
 * - They don't count towards room capacity
 * - They don't count towards car capacity
 * 
 * @param input - Passenger breakdown
 * @returns Number of effective passengers
 */
export function calculateEffectivePax(input: PassengerInput): number {
  return input.adults + input.childrenOver6;
}

/**
 * Calculate effective pax from individual child ages
 * 
 * @param adults - Number of adults
 * @param childAges - Array of each child's age
 * @returns Breakdown of effective pax and child categories
 */
export function calculateEffectivePaxFromAges(
  adults: number,
  childAges: number[]
): { effectivePax: number; childrenOver6: number; childrenUnder6: number } {
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

/**
 * Calculates total passengers for display purposes only.
 * Note: Car and SIM are based on effectivePax, NOT totalPax!
 * 
 * @param input - Passenger breakdown
 * @returns Total number of passengers
 */
export function calculateTotalPax(input: PassengerInput): number {
  return input.adults + input.childrenOver6 + input.childrenUnder6;
}

/**
 * Smart Room Allocation Algorithm (STRICT MAPPING)
 * 
 * Uses exact room allocation for 1-6 pax:
 * - 1 Pax = 1 Single (billed at DBL/SGL price)
 * - 2 Pax = 1 Double
 * - 3 Pax = 1 Triple
 * - 4 Pax = 2 Doubles
 * - 5 Pax = 1 Double + 1 Triple
 * - 6 Pax = 2 Triples
 * 
 * For 7+ pax: Prioritizes triples to minimize total rooms
 * 
 * @param effectivePax - Number of passengers requiring room space
 * @returns Optimal room allocation breakdown
 * 
 * @example
 * allocateRooms(1) // { singleRooms: 1, doubleRooms: 0, tripleRooms: 0 }
 * allocateRooms(4) // { singleRooms: 0, doubleRooms: 2, tripleRooms: 0 }
 * allocateRooms(5) // { singleRooms: 0, doubleRooms: 1, tripleRooms: 1 }
 */
export function allocateRooms(effectivePax: number): RoomAllocation {
  if (effectivePax <= 0) {
    return {
      singleRooms: 0,
      doubleRooms: 0,
      tripleRooms: 0,
      totalRooms: 0,
      effectivePax: 0,
    };
  }

  // STRICT MAPPING for 1-6 pax
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

  // Handle remaining passengers
  switch (remaining) {
    case 0:
      // Perfect fit with triples only
      break;
    case 1:
      // 1 remaining: convert 1 triple to 2 doubles (3+1=4 = 2×2)
      if (tripleRooms > 0) {
        tripleRooms--;
        doubleRooms = 2;
      } else {
        singleRooms = 1;
      }
      break;
    case 2:
      // 2 remaining: 1 double room
      doubleRooms = 1;
      break;
  }

  const totalRooms = singleRooms + doubleRooms + tripleRooms;

  return {
    singleRooms,
    doubleRooms,
    tripleRooms,
    totalRooms,
    effectivePax,
  };
}

/**
 * Full room allocation with passenger input
 * 
 * Convenience function that combines effective pax calculation
 * with room allocation in a single call.
 * 
 * @param input - Passenger breakdown
 * @returns Complete room allocation result
 */
export function allocateRoomsForPassengers(input: PassengerInput): RoomAllocation {
  const effectivePax = calculateEffectivePax(input);
  return allocateRooms(effectivePax);
}

/**
 * Validates room allocation - ensures all passengers are housed
 * 
 * @param allocation - Room allocation to validate
 * @returns true if allocation houses all effective passengers
 */
export function validateAllocation(allocation: RoomAllocation): boolean {
  const capacity = 
    (allocation.tripleRooms * 3) + 
    (allocation.doubleRooms * 2) + 
    (allocation.singleRooms * 1);
  
  return capacity >= allocation.effectivePax;
}
