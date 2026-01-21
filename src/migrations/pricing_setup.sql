-- Create the pricing_rules table
CREATE TABLE IF NOT EXISTS pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_category text NOT NULL UNIQUE,
  base_fare numeric NOT NULL,
  min_fare numeric NOT NULL,
  rate_per_km_city numeric NOT NULL,
  rate_per_km_intercity numeric NOT NULL,
  rate_per_min numeric NOT NULL,
  night_multiplier numeric NOT NULL DEFAULT 1.2,
  surge_multiplier numeric NOT NULL DEFAULT 1.0,
  waiting_rate numeric NOT NULL DEFAULT 2,
  city_radius_km numeric NOT NULL DEFAULT 50,
  created_at timestamp with time zone DEFAULT now()
);

-- Turn on Row Level Security (optional, depending on your auth setup)
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read pricing rules (assuming public pricing)
CREATE POLICY "Public pricing rules" ON pricing_rules FOR SELECT USING (true);

-- Allow service role or admins to update (adjust as needed)
-- CREATE POLICY "Admin update pricing" ON pricing_rules FOR ALL USING (auth.role() = 'service_role');

-- Seed initial data (City Rates > Intercity Rates as per request)
INSERT INTO pricing_rules 
(car_category, base_fare, min_fare, rate_per_km_city, rate_per_km_intercity, rate_per_min, city_radius_km) 
VALUES
('SEDAN',   50, 100, 18, 12, 2, 50),
('SUV',     80, 150, 24, 16, 3, 50),
('PREMIUM', 100, 250, 35, 25, 5, 50),
('MINIBUS', 200, 500, 40, 30, 5, 50)
ON CONFLICT (car_category) 
DO UPDATE SET 
  rate_per_km_city = EXCLUDED.rate_per_km_city,
  rate_per_km_intercity = EXCLUDED.rate_per_km_intercity;
