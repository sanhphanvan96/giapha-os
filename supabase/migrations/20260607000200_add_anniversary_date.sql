-- Add custom death anniversary date fields to persons table
ALTER TABLE "public"."persons"
ADD COLUMN "anniversary_lunar_day" smallint,
ADD COLUMN "anniversary_lunar_month" smallint,
ADD COLUMN "anniversary_lunar_year" smallint;
