-- Add location_type column to destinations table
-- This separates the text location (iloilo_city/iloilo_province) from the spatial location
alter table destinations
rename column location to location_type;

-- Add PostGIS geography point column for spatial queries
-- This stores the actual geographic coordinate for radius searches
alter table destinations
add column if not exists location geography(POINT, 4326);

-- Add updated_at column for tracking changes
alter table destinations
add column if not exists updated_at timestamptz default now();

-- Create a trigger to automatically update updated_at on row changes
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_destinations_updated_at
  before update on destinations
  for each row
  execute function update_updated_at_column();
