-- ============================================================================
-- LUXURY WORLD (عالم الفخامة) - Travel Agency Quotation System Update
-- Migration Date: March 6, 2026
-- Description: Complete schema overhaul for new pricing model with 5 offer tiers,
--              dynamic car pricing by pax capacity, and smart room allocation support
-- ============================================================================

-- ============================================================================
-- 1. UPDATE SYSTEM SETTINGS TABLE
-- ============================================================================

-- Add new columns to system_settings for dynamic configuration
ALTER TABLE public.system_settings 
ADD COLUMN IF NOT EXISTS base_currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS exchange_rate_usd_to_sar NUMERIC DEFAULT 3.8,
ADD COLUMN IF NOT EXISTS free_sim_cards_allowance INTEGER DEFAULT 2;

-- Update default profit margin to 22%
UPDATE public.system_settings SET profit_margin = 22 WHERE profit_margin = 15;

-- ============================================================================
-- 2. CREATE NEW CAR PRICING TABLE (PAX-BASED)
-- ============================================================================

-- Drop old cars table dependencies and create new pax-based pricing
CREATE TABLE IF NOT EXISTS public.car_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_pax INTEGER NOT NULL,
  max_pax INTEGER NOT NULL,
  price_per_day NUMERIC NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(min_pax, max_pax)
);

-- Enable RLS
ALTER TABLE public.car_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public read car_pricing" ON public.car_pricing FOR SELECT USING (true);
CREATE POLICY "Auth manage car_pricing" ON public.car_pricing FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_car_pricing_updated_at 
  BEFORE UPDATE ON public.car_pricing 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert car pricing data based on pax capacity
INSERT INTO public.car_pricing (min_pax, max_pax, price_per_day, description_ar, description_en) VALUES
  (1, 3, 100, 'سيدان (1-3 ركاب)', 'Sedan (1-3 pax)'),
  (4, 6, 120, 'ميني فان (4-6 ركاب)', 'Minivan (4-6 pax)'),
  (7, 8, 160, 'فان متوسط (7-8 ركاب)', 'Medium Van (7-8 pax)'),
  (9, 12, 250, 'فان كبير (9-12 ركاب)', 'Large Van (9-12 pax)'),
  (13, 24, 550, 'باص صغير (13-24 ركاب)', 'Mini Bus (13-24 pax)'),
  (25, 45, 700, 'باص كبير (25-45 ركاب)', 'Large Bus (25-45 pax)')
ON CONFLICT (min_pax, max_pax) DO UPDATE SET
  price_per_day = EXCLUDED.price_per_day,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en;

-- ============================================================================
-- 3. CREATE NEW OFFER TIERS SYSTEM
-- ============================================================================

-- Create offer_tier type (1-5)
DO $$ BEGIN
  CREATE TYPE public.offer_tier_type AS ENUM ('tier_1', 'tier_2', 'tier_3', 'tier_4', 'tier_5');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create new hotel_offers table with proper structure
CREATE TABLE IF NOT EXISTS public.hotel_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_tier offer_tier_type NOT NULL,
  city TEXT NOT NULL,
  hotel_name TEXT NOT NULL,
  dbl_view NUMERIC NOT NULL DEFAULT 0,
  dbl_no_view NUMERIC NOT NULL DEFAULT 0,
  trbl_view NUMERIC NOT NULL DEFAULT 0,
  trbl_no_view NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(offer_tier, city)
);

-- Enable RLS
ALTER TABLE public.hotel_offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public read hotel_offers" ON public.hotel_offers FOR SELECT USING (true);
CREATE POLICY "Auth manage hotel_offers" ON public.hotel_offers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_hotel_offers_updated_at 
  BEFORE UPDATE ON public.hotel_offers 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 4. SEED HOTEL OFFERS DATA (5 TIERS)
-- ============================================================================

-- Clear existing data
DELETE FROM public.hotel_offers;

-- Offer 1 (Tier 1)
INSERT INTO public.hotel_offers (offer_tier, city, hotel_name, dbl_view, dbl_no_view, trbl_view, trbl_no_view) VALUES
  ('tier_1', 'Tbilisi', 'Marjan plaza hotel', 90, 80, 130, 120),
  ('tier_1', 'Bakuriani', 'Bakuriani inn 5*', 85, 75, 105, 95),
  ('tier_1', 'Dashbash', 'Diamond Resort 5*', 120, 120, 140, 140),
  ('tier_1', 'Batumi', 'Batumi luxury view', 120, 110, 175, 165),
  ('tier_1', 'Kutaisi', 'kutaisi inn hotel*5', 90, 90, 130, 130),
  ('tier_1', 'Gudauri', 'Quadrum Resort', 85, 75, 120, 115),
  ('tier_1', 'Borjomi', 'فندق محلي مميز', 120, 100, 140, 120);

-- Offer 2 (Tier 2)
INSERT INTO public.hotel_offers (offer_tier, city, hotel_name, dbl_view, dbl_no_view, trbl_view, trbl_no_view) VALUES
  ('tier_2', 'Tbilisi', 'Gallery Palace', 55, 45, 75, 65),
  ('tier_2', 'Bakuriani', 'Bakuriani inn 5*', 85, 75, 105, 95),
  ('tier_2', 'Dashbash', 'Diamond Resort 5*', 120, 120, 140, 140),
  ('tier_2', 'Batumi', 'New Wave Hotel', 105, 85, 135, 125),
  ('tier_2', 'Kutaisi', 'kutaisi inn hotel*5', 90, 90, 130, 130),
  ('tier_2', 'Gudauri', 'Gudauri inn', 75, 65, 100, 85),
  ('tier_2', 'Borjomi', 'فندق محلي مميز', 120, 100, 140, 120);

-- Offer 3 (Tier 3)
INSERT INTO public.hotel_offers (offer_tier, city, hotel_name, dbl_view, dbl_no_view, trbl_view, trbl_no_view) VALUES
  ('tier_3', 'Tbilisi', 'Hualing dormitory', 60, 55, 80, 75),
  ('tier_3', 'Bakuriani', 'Bakuriani inn 5*', 85, 75, 105, 95),
  ('tier_3', 'Dashbash', 'Diamond Resort 5*', 120, 120, 140, 140),
  ('tier_3', 'Batumi', 'Aqua hotel', 80, 75, 90, 85),
  ('tier_3', 'Kutaisi', 'kutaisi inn hotel*5', 90, 90, 130, 130),
  ('tier_3', 'Gudauri', 'Gudauri inn', 75, 65, 100, 85),
  ('tier_3', 'Borjomi', 'فندق محلي مميز', 120, 100, 140, 120);

-- Offer 4 (Tier 4)
INSERT INTO public.hotel_offers (offer_tier, city, hotel_name, dbl_view, dbl_no_view, trbl_view, trbl_no_view) VALUES
  ('tier_4', 'Tbilisi', 'radisson red 5*', 150, 135, 205, 195),
  ('tier_4', 'Bakuriani', 'crystal hotel 5*', 115, 105, 165, 155),
  ('tier_4', 'Borjomi', 'Borjomi Likani 5*', 180, 120, 230, 195),
  ('tier_4', 'Batumi', 'Batumi luxury view', 120, 110, 175, 165),
  ('tier_4', 'Kutaisi', 'west inn', 120, 115, 140, 135),
  ('tier_4', 'Gudauri', 'Monte Hotel', 175, 155, 190, 170),
  ('tier_4', 'Dashbash', 'فندق محلي مميز', 120, 100, 140, 120);

-- Offer 5 (Tier 5)
INSERT INTO public.hotel_offers (offer_tier, city, hotel_name, dbl_view, dbl_no_view, trbl_view, trbl_no_view) VALUES
  ('tier_5', 'Tbilisi', 'Biltmore or pullman*5', 215, 215, 270, 270),
  ('tier_5', 'Bakuriani', 'crystal hotel 5*', 115, 105, 165, 155),
  ('tier_5', 'Borjomi', 'Crowne Plaza Borjomi 5*', 245, 200, 270, 225),
  ('tier_5', 'Batumi', 'Hilton Batumi*5', 260, 220, 305, 265),
  ('tier_5', 'Kutaisi', 'kutaisi inn hotel*5', 90, 90, 130, 130),
  ('tier_5', 'Gudauri', 'Monte Hotel', 175, 155, 190, 170),
  ('tier_5', 'Dashbash', 'فندق محلي مميز', 120, 100, 140, 120);

-- ============================================================================
-- 5. UPDATE MANDATORY SERVICES TABLE
-- ============================================================================

-- Ensure sim_card_price is set correctly
UPDATE public.mandatory_services SET sim_card_price = 15;

-- ============================================================================
-- 6. ADD CITIES IF MISSING
-- ============================================================================

-- Add Bakuriani and Dashbash cities if they don't exist
INSERT INTO public.cities (name_ar, name_en, supports_view, sort_order)
SELECT 'باكورياني', 'Bakuriani', true, 7
WHERE NOT EXISTS (SELECT 1 FROM public.cities WHERE name_en = 'Bakuriani');

INSERT INTO public.cities (name_ar, name_en, supports_view, sort_order)
SELECT 'داشباش', 'Dashbash', true, 8
WHERE NOT EXISTS (SELECT 1 FROM public.cities WHERE name_en = 'Dashbash');

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
