-- Add latitude and longitude columns to accommodations table
alter table accommodations
add column if not exists latitude numeric;

alter table accommodations
add column if not exists longitude numeric;

-- Add location_type column to accommodations table
alter table accommodations
add column if not exists location_type text not null default 'iloilo_city';

-- Add a check constraint to ensure valid location_type values
-- Note: Run this only if the constraint doesn't already exist
alter table accommodations
add constraint valid_accommodation_location_type
check (location_type in ('iloilo_city', 'iloilo_province'));

-- Add PostGIS geography point column for spatial queries
alter table accommodations
add column if not exists location geography(POINT, 4326);

-- Add updated_at column for tracking changes
alter table accommodations
add column if not exists updated_at timestamptz default now();

-- Create a trigger to automatically update updated_at on row changes
create trigger update_accommodations_updated_at
  before update on accommodations
  for each row
  execute function update_updated_at_column();
