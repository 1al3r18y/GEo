-- ============================================================================
-- LUXURY WORLD - Dynamic Smart Hotel Recommendation Engine
-- Migration Date: March 7, 2026
-- Description: Pivot from fixed tier_1..tier_5 to category-based hotel pool.
--   offer_tier → category (اقتصادي, ستاندرد, متوسط, ديلوكس, فاخر)
--   Removes UNIQUE(offer_tier, city) — multiple hotels per city+category.
-- ============================================================================

-- 1. Add category column
ALTER TABLE public.hotel_offers ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Migrate existing data
UPDATE public.hotel_offers SET category = 'اقتصادي' WHERE offer_tier = 'tier_1';
UPDATE public.hotel_offers SET category = 'ستاندرد' WHERE offer_tier = 'tier_2';
UPDATE public.hotel_offers SET category = 'متوسط'  WHERE offer_tier = 'tier_3';
UPDATE public.hotel_offers SET category = 'ديلوكس' WHERE offer_tier = 'tier_4';
UPDATE public.hotel_offers SET category = 'فاخر'   WHERE offer_tier = 'tier_5';

-- 3. Drop old unique constraint (offer_tier, city)
ALTER TABLE public.hotel_offers DROP CONSTRAINT IF EXISTS hotel_offers_offer_tier_city_key;

-- 4. Drop offer_tier column
ALTER TABLE public.hotel_offers DROP COLUMN IF EXISTS offer_tier;

-- 5. Make category NOT NULL now that it's populated
ALTER TABLE public.hotel_offers ALTER COLUMN category SET NOT NULL;

-- 6. Add index for smart engine queries (category + city + is_active)
CREATE INDEX IF NOT EXISTS idx_hotel_offers_category_city 
  ON public.hotel_offers(category, city) WHERE is_active = true;
