/**
 * ============================================================================
 * LUXURY WORLD (عالم الفخامة) - Smart Room Allocation Engine
 * ============================================================================
 * 
 * This module implements the intelligent room allocation algorithm that
 * distributes effective passengers into minimal rooms, prioritizing:
 * 1. Triple rooms first
 * 2. Double rooms second
 * 3. Single rooms last (only if necessary)
 * 
 * @module SmartRoomAllocation
 * @version 1.0.0
 * @date March 6, 2026
 */

export interface RoomAllocation {
  tripleRooms: number;
  doubleRooms: number;
  singleRooms: number;
  totalRooms: number;
  effectivePax: number;
}

export interface PassengerInput {
  adults: number;
  childrenOver6: number;  // Children > 6 years old count as effective pax
  childrenUnder6: number; // Children <= 6 years old don't count for room allocation
}

/**
 * Calculates the effective number of passengers for room allocation purposes.
 * 
 * Formula: Effective Pax = Adults + Children > 6 years old
 * 
 * Children under 6 years old do not count towards room allocation
 * as they typically share beds with adults.
 * 
 * @param input - Passenger breakdown
 * @returns Number of effective passengers requiring room space
 */
export function calculateEffectivePax(input: PassengerInput): number {
  return input.adults + input.childrenOver6;
}

/**
 * Calculates total passengers (for car pricing purposes).
 * 
 * Formula: Total Pax = Adults + All Children
 * 
 * @param input - Passenger breakdown
 * @returns Total number of passengers
 */
export function calculateTotalPax(input: PassengerInput): number {
  return input.adults + input.childrenOver6 + input.childrenUnder6;
}

/**
 * Smart Room Allocation Algorithm
 * 
 * Distributes effective passengers into the minimum possible number of rooms,
 * strictly prioritizing:
 * 1. Triple rooms (capacity: 3)
 * 2. Double rooms (capacity: 2)
 * 3. Single rooms (capacity: 1) - only when necessary
 * 
 * The algorithm uses a greedy approach to maximize triple room usage first,
 * then fills remaining capacity with doubles, and uses singles only for
 * any remaining odd person.
 * 
 * @param effectivePax - Number of passengers requiring room space
 * @returns Optimal room allocation breakdown
 * 
 * @example
 * // 5 effective pax: 1 triple + 1 double = 2 rooms
 * allocateRooms(5) // { tripleRooms: 1, doubleRooms: 1, singleRooms: 0 }
 * 
 * @example
 * // 7 effective pax: 2 triples + 0 doubles + 1 single = 3 rooms
 * allocateRooms(7) // { tripleRooms: 2, doubleRooms: 0, singleRooms: 1 }
 */
export function allocateRooms(effectivePax: number): RoomAllocation {
  if (effectivePax <= 0) {
    return {
      tripleRooms: 0,
      doubleRooms: 0,
      singleRooms: 0,
      totalRooms: 0,
      effectivePax: 0,
    };
  }

  // Start by maximizing triple rooms
  let tripleRooms = Math.floor(effectivePax / 3);
  let remaining = effectivePax % 3;

  let doubleRooms = 0;
  let singleRooms = 0;

  // Handle remaining passengers
  switch (remaining) {
    case 0:
      // Perfect fit with triples only
      break;
    case 1:
      // One person left: 
      // Option A: 1 single room
      // Option B: Reduce 1 triple, add 2 doubles (3-1+2*2 = 4, but we need 3+1=4) 
      // For minimum rooms, 1 single is better than converting
      if (tripleRooms > 0) {
        // Convert: remove 1 triple (lose 3), add 2 doubles (gain 4) - handles 4 people
        // But we only have 3+1=4 effective people to house
        // Actually 1 triple + 1 remaining = need to house 4 people
        // Remove triple: 0 triples, add 2 doubles = 2 rooms for 4 people ✓
        tripleRooms--;
        doubleRooms = 2;
      } else {
        // No triples to convert, just use 1 single
        singleRooms = 1;
      }
      break;
    case 2:
      // Two people left: 1 double room is optimal
      doubleRooms = 1;
      break;
  }

  const totalRooms = tripleRooms + doubleRooms + singleRooms;

  return {
    tripleRooms,
    doubleRooms,
    singleRooms,
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
