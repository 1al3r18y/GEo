-- ═══════════════════════════════════════════════════════════════
-- v12.0.0 Migration: Strict Hotel Matrix + Cached Quotes Table
-- Date: March 13, 2026
-- ═══════════════════════════════════════════════════════════════

-- 1. Disable RLS on hotel_offers for admin operations
ALTER TABLE hotel_offers DISABLE ROW LEVEL SECURITY;

-- 2. Delete all existing hotel_offers
DELETE FROM hotel_offers;

-- 3. Insert Standard Offers (6 tiers × 6 cities = 36 rows)
-- ── Tier 1 (عرض 1) ──
INSERT INTO hotel_offers (city, hotel_name, dbl_view, trbl_view, dbl_no_view, trbl_no_view, category, is_active) VALUES
('Tbilisi',   'Episoide tbilisi',    70,  95,  70,  95,  'عرض 1', true),
('Bakuriani', 'Bakuraini inn',       80,  135, 70,  120, 'عرض 1', true),
('Dashbash',  'Kass Land Diamond',   110, 160, 110, 160, 'عرض 1', true),
('Batumi',    'Luxury view batumi',  90,  110, 80,  95,  'عرض 1', true),
('Gudauri',   'Gudauri inn',         140, 160, 140, 160, 'عرض 1', true),
('Borjomi',   'Borjomi likani',      150, 200, 140, 180, 'عرض 1', true);

-- ── Tier 2 (عرض 2) — Tbilisi only differs ──
INSERT INTO hotel_offers (city, hotel_name, dbl_view, trbl_view, dbl_no_view, trbl_no_view, category, is_active) VALUES
('Tbilisi',   'Marjan palza',        100, 145, 100, 145, 'عرض 2', true),
('Bakuriani', 'Bakuraini inn',       80,  135, 70,  120, 'عرض 2', true),
('Dashbash',  'Kass Land Diamond',   110, 160, 110, 160, 'عرض 2', true),
('Batumi',    'Luxury view batumi',  90,  110, 80,  95,  'عرض 2', true),
('Gudauri',   'Gudauri inn',         140, 160, 140, 160, 'عرض 2', true),
('Borjomi',   'Borjomi likani',      150, 200, 140, 180, 'عرض 2', true);

-- ── Tier 3 (عرض 3) — Tbilisi + Gudauri differ ──
INSERT INTO hotel_offers (city, hotel_name, dbl_view, trbl_view, dbl_no_view, trbl_no_view, category, is_active) VALUES
('Tbilisi',   'Radisson red tbilisi', 140, 160, 140, 160, 'عرض 3', true),
('Bakuriani', 'Bakuraini inn',        80,  135, 70,  120, 'عرض 3', true),
('Dashbash',  'Kass Land Diamond',    110, 160, 110, 160, 'عرض 3', true),
('Batumi',    'Luxury view batumi',   90,  110, 80,  95,  'عرض 3', true),
('Gudauri',   'monte Gudauri',        160, 180, 160, 180, 'عرض 3', true),
('Borjomi',   'Borjomi likani',       150, 200, 140, 180, 'عرض 3', true);

-- ── Tier 4 (عرض 4) = Same as Tier 1 ──
INSERT INTO hotel_offers (city, hotel_name, dbl_view, trbl_view, dbl_no_view, trbl_no_view, category, is_active) VALUES
('Tbilisi',   'Episoide tbilisi',    70,  95,  70,  95,  'عرض 4', true),
('Bakuriani', 'Bakuraini inn',       80,  135, 70,  120, 'عرض 4', true),
('Dashbash',  'Kass Land Diamond',   110, 160, 110, 160, 'عرض 4', true),
('Batumi',    'Luxury view batumi',  90,  110, 80,  95,  'عرض 4', true),
('Gudauri',   'Gudauri inn',         140, 160, 140, 160, 'عرض 4', true),
('Borjomi',   'Borjomi likani',      150, 200, 140, 180, 'عرض 4', true);

-- ── Tier 5 (عرض 5) = Same as Tier 2 ──
INSERT INTO hotel_offers (city, hotel_name, dbl_view, trbl_view, dbl_no_view, trbl_no_view, category, is_active) VALUES
('Tbilisi',   'Marjan palza',        100, 145, 100, 145, 'عرض 5', true),
('Bakuriani', 'Bakuraini inn',       80,  135, 70,  120, 'عرض 5', true),
('Dashbash',  'Kass Land Diamond',   110, 160, 110, 160, 'عرض 5', true),
('Batumi',    'Luxury view batumi',  90,  110, 80,  95,  'عرض 5', true),
('Gudauri',   'Gudauri inn',         140, 160, 140, 160, 'عرض 5', true),
('Borjomi',   'Borjomi likani',      150, 200, 140, 180, 'عرض 5', true);

-- ── Tier 6 (عرض 6) = Same as Tier 3 ──
INSERT INTO hotel_offers (city, hotel_name, dbl_view, trbl_view, dbl_no_view, trbl_no_view, category, is_active) VALUES
('Tbilisi',   'Radisson red tbilisi', 140, 160, 140, 160, 'عرض 6', true),
('Bakuriani', 'Bakuraini inn',        80,  135, 70,  120, 'عرض 6', true),
('Dashbash',  'Kass Land Diamond',    110, 160, 110, 160, 'عرض 6', true),
('Batumi',    'Luxury view batumi',   90,  110, 80,  95,  'عرض 6', true),
('Gudauri',   'monte Gudauri',        160, 180, 160, 180, 'عرض 6', true),
('Borjomi',   'Borjomi likani',       150, 200, 140, 180, 'عرض 6', true);

-- 4. Insert Honeymoon Offers (6 tiers × 6 cities = 36 rows, DBL_view only)
-- ── Honeymoon 1 (هنيمون 1) ──
INSERT INTO hotel_offers (city, hotel_name, dbl_view, trbl_view, dbl_no_view, trbl_no_view, category, is_active) VALUES
('Tbilisi',   'radisson red 5*',      155, 0, 0, 0, 'هنيمون 1', true),
('Bakuriani', 'crystal valla 5*',     90,  0, 0, 0, 'هنيمون 1', true),
('Borjomi',   'Borjomi Likani 5*',    180, 0, 0, 0, 'هنيمون 1', true),
('Batumi',    'batumi luxury view',   135, 0, 0, 0, 'هنيمون 1', true),
('Dashbash',  'Diamond Resort 5*',    120, 0, 0, 0, 'هنيمون 1', true),
('Gudauri',   'Monte Hotel',          175, 0, 0, 0, 'هنيمون 1', true);

-- ── Honeymoon 2 (هنيمون 2) ──
INSERT INTO hotel_offers (city, hotel_name, dbl_view, trbl_view, dbl_no_view, trbl_no_view, category, is_active) VALUES
('Tbilisi',   'radisson red 5*',      155, 0, 0, 0, 'هنيمون 2', true),
('Bakuriani', 'Bakuriani inn 5*',     65,  0, 0, 0, 'هنيمون 2', true),
('Borjomi',   'Borjomi Likani 5*',    180, 0, 0, 0, 'هنيمون 2', true),
('Batumi',    'Best Western Premier', 155, 0, 0, 0, 'هنيمون 2', true),
('Dashbash',  'Diamond Resort 5*',    120, 0, 0, 0, 'هنيمون 2', true),
('Gudauri',   'Monte',               175, 0, 0, 0, 'هنيمون 2', true);

-- ── Honeymoon 3 (هنيمون 3) ──
INSERT INTO hotel_offers (city, hotel_name, dbl_view, trbl_view, dbl_no_view, trbl_no_view, category, is_active) VALUES
('Tbilisi',   'Biltmore or pullman',    215, 0, 0, 0, 'هنيمون 3', true),
('Bakuriani', 'crystal hotel 5*',       115, 0, 0, 0, 'هنيمون 3', true),
('Borjomi',   'Crowne Plaza Borjomi 5*', 245, 0, 0, 0, 'هنيمون 3', true),
('Batumi',    'HILTON BATUMI',          260, 0, 0, 0, 'هنيمون 3', true),
('Dashbash',  'Diamond Resort 5*',      120, 0, 0, 0, 'هنيمون 3', true),
('Gudauri',   'Guadauri lodge 5*',      100, 0, 0, 0, 'هنيمون 3', true);

-- ── Honeymoon 4 (هنيمون 4) ──
INSERT INTO hotel_offers (city, hotel_name, dbl_view, trbl_view, dbl_no_view, trbl_no_view, category, is_active) VALUES
('Tbilisi',   'Gallery Palace',     60,  0, 0, 0, 'هنيمون 4', true),
('Bakuriani', 'bakurini inn 5*',    85,  0, 0, 0, 'هنيمون 4', true),
('Borjomi',   'borjomi Palace',     180, 0, 0, 0, 'هنيمون 4', true),
('Batumi',    'New Wave Hotel',     105, 0, 0, 0, 'هنيمون 4', true),
('Dashbash',  'Diamond Resort 5*',  120, 0, 0, 0, 'هنيمون 4', true),
('Gudauri',   'Gudauri inn',        75,  0, 0, 0, 'هنيمون 4', true);

-- ── Honeymoon 5 (هنيمون 5) ──
INSERT INTO hotel_offers (city, hotel_name, dbl_view, trbl_view, dbl_no_view, trbl_no_view, category, is_active) VALUES
('Tbilisi',   'Marjan Plaza hotel',   95,  0, 0, 0, 'هنيمون 5', true),
('Bakuriani', 'Bakuriani inn 5*',     85,  0, 0, 0, 'هنيمون 5', true),
('Borjomi',   'borjomi Palace',       180, 0, 0, 0, 'هنيمون 5', true),
('Batumi',    'Alliance Palace',      120, 0, 0, 0, 'هنيمون 5', true),
('Dashbash',  'Diamond Resort 5*',    115, 0, 0, 0, 'هنيمون 5', true),
('Gudauri',   'Gudauri inn',          75,  0, 0, 0, 'هنيمون 5', true);

-- ── Honeymoon 6 — Cottages / كوخ (هنيمون 6) ──
INSERT INTO hotel_offers (city, hotel_name, dbl_view, trbl_view, dbl_no_view, trbl_no_view, category, is_active) VALUES
('Tbilisi',   'كوخ في تبليسي',    230, 0, 0, 0, 'هنيمون 6', true),
('Bakuriani', 'كوخ في باكورياني',  230, 0, 0, 0, 'هنيمون 6', true),
('Borjomi',   'كوخ في بورجومي',   230, 0, 0, 0, 'هنيمون 6', true),
('Batumi',    'كوخ في باتومي',    450, 0, 0, 0, 'هنيمون 6', true),
('Kutaisi',   'كوخ في كوتايسي',   230, 0, 0, 0, 'هنيمون 6', true),
('Gudauri',   'كوخ في غوداوري',   230, 0, 0, 0, 'هنيمون 6', true);

-- 5. Create cached_quotes table for Telegram file_id caching
CREATE TABLE IF NOT EXISTS cached_quotes (
  hash_key TEXT PRIMARY KEY,
  mobile_file_id TEXT,
  desktop_file_id TEXT,
  vip_file_id TEXT,
  honey_file_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Keep RLS disabled for anon key access (bot + dashboard both use anon key)
-- Already disabled above
