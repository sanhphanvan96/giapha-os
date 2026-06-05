-- Add actual lunar birth date columns
ALTER TABLE public.persons 
ADD COLUMN IF NOT EXISTS birth_lunar_day INT,
ADD COLUMN IF NOT EXISTS birth_lunar_month INT,
ADD COLUMN IF NOT EXISTS birth_lunar_year INT;

-- Add legal birth date columns (Solar only)
ALTER TABLE public.persons 
ADD COLUMN IF NOT EXISTS legal_birth_day INT,
ADD COLUMN IF NOT EXISTS legal_birth_month INT,
ADD COLUMN IF NOT EXISTS legal_birth_year INT;

-- Add birthday reminder type configuration column
ALTER TABLE public.persons 
ADD COLUMN IF NOT EXISTS birthday_remind_type TEXT DEFAULT 'actual_solar' NOT NULL;
