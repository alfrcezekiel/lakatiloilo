-- Enable PostGIS extension for spatial queries
-- This allows us to store geography points and perform spatial queries
-- like finding destinations within a certain radius

create extension if not exists postgis;
