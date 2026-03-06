
-- Seasons enum
CREATE TYPE public.season_type AS ENUM ('high', 'low', 'mid');

-- Cities table
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  supports_view BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Hotel tiers
CREATE TYPE public.hotel_tier AS ENUM ('economy', 'standard', 'superior', 'deluxe', 'luxury');

-- Hotels table
CREATE TABLE public.hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  city_id UUID REFERENCES public.cities(id) ON DELETE CASCADE NOT NULL,
  tier hotel_tier NOT NULL DEFAULT 'standard',
  price_single NUMERIC NOT NULL DEFAULT 0,
  price_double NUMERIC NOT NULL DEFAULT 0,
  price_triple NUMERIC NOT NULL DEFAULT 0,
  price_single_view NUMERIC DEFAULT 0,
  price_double_view NUMERIC DEFAULT 0,
  price_triple_view NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Car types
CREATE TYPE public.car_type AS ENUM ('sedan', 'minivan', 'van', 'sprinter');

-- Cars table
CREATE TABLE public.cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_type car_type NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  min_pax INTEGER NOT NULL,
  max_pax INTEGER NOT NULL,
  price_per_day_high NUMERIC NOT NULL DEFAULT 0,
  price_per_day_low NUMERIC NOT NULL DEFAULT 0,
  price_per_day_mid NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Airports table
CREATE TABLE public.airports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Airport transfer pricing
CREATE TABLE public.airport_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airport_id UUID REFERENCES public.airports(id) ON DELETE CASCADE NOT NULL,
  car_type car_type NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(airport_id, car_type)
);

-- City routes (distribution logic)
CREATE TABLE public.city_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_nights INTEGER NOT NULL,
  city_id UUID REFERENCES public.cities(id) ON DELETE CASCADE NOT NULL,
  nights_in_city INTEGER NOT NULL,
  route_order INTEGER NOT NULL DEFAULT 0,
  arrival_airport_id UUID REFERENCES public.airports(id),
  departure_airport_id UUID REFERENCES public.airports(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mandatory services settings
CREATE TABLE public.mandatory_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sim_card_price NUMERIC NOT NULL DEFAULT 15,
  insurance_price_per_day_per_pax NUMERIC NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- System settings (profit margin etc)
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profit_margin NUMERIC NOT NULL DEFAULT 15,
  active_season season_type NOT NULL DEFAULT 'high',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airport_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mandatory_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read for all tables
CREATE POLICY "Public read cities" ON public.cities FOR SELECT USING (true);
CREATE POLICY "Public read hotels" ON public.hotels FOR SELECT USING (true);
CREATE POLICY "Public read cars" ON public.cars FOR SELECT USING (true);
CREATE POLICY "Public read airports" ON public.airports FOR SELECT USING (true);
CREATE POLICY "Public read airport_transfers" ON public.airport_transfers FOR SELECT USING (true);
CREATE POLICY "Public read city_routes" ON public.city_routes FOR SELECT USING (true);
CREATE POLICY "Public read mandatory_services" ON public.mandatory_services FOR SELECT USING (true);
CREATE POLICY "Public read system_settings" ON public.system_settings FOR SELECT USING (true);

-- Allow authenticated users to manage all tables
CREATE POLICY "Auth manage cities" ON public.cities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth manage hotels" ON public.hotels FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth manage cars" ON public.cars FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth manage airports" ON public.airports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth manage airport_transfers" ON public.airport_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth manage city_routes" ON public.city_routes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth manage mandatory_services" ON public.mandatory_services FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth manage system_settings" ON public.system_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default mandatory services
INSERT INTO public.mandatory_services (sim_card_price, insurance_price_per_day_per_pax) VALUES (15, 5);

-- Insert default system settings
INSERT INTO public.system_settings (profit_margin, active_season) VALUES (15, 'high');

-- Insert Georgian airports
INSERT INTO public.airports (name_ar, name_en, code) VALUES
  ('مطار تبليسي الدولي', 'Tbilisi International Airport', 'TBS'),
  ('مطار كوتايسي الدولي', 'Kutaisi International Airport', 'KUT'),
  ('مطار باتومي الدولي', 'Batumi International Airport', 'BUS');

-- Insert Georgian cities
INSERT INTO public.cities (name_ar, name_en, supports_view, sort_order) VALUES
  ('تبليسي', 'Tbilisi', false, 1),
  ('باتومي', 'Batumi', true, 2),
  ('كوتايسي', 'Kutaisi', false, 3),
  ('بورجومي', 'Borjomi', false, 4),
  ('غوداوري', 'Gudauri', true, 5),
  ('كازبيغي', 'Kazbegi', true, 6);

-- Insert default cars
INSERT INTO public.cars (car_type, name_ar, name_en, min_pax, max_pax, price_per_day_high, price_per_day_low, price_per_day_mid) VALUES
  ('sedan', 'سيدان', 'Sedan', 1, 3, 80, 60, 70),
  ('minivan', 'ميني فان', 'Minivan', 4, 6, 120, 90, 105),
  ('van', 'فان', 'Van', 7, 7, 150, 110, 130),
  ('sprinter', 'سبرنتر', 'Sprinter', 8, 14, 200, 150, 175);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON public.hotels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON public.cars FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mandatory_services_updated_at BEFORE UPDATE ON public.mandatory_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
