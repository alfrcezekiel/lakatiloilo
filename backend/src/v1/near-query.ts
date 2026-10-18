import { BadRequestException } from '@nestjs/common';
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

// Shared by GET /v1/destinations/near and GET /v1/accommodations/near.

// Iloilo Province is about 150 km end to end, so 200 km covers it all
// and stops someone asking for the whole planet in one request.
const MAX_RADIUS_KM = 200;

export interface NearParams {
  lat: number;
  lng: number;
  radiusKm: number;
}

// Query values arrive as text. Turn them into numbers and reject
// anything missing or out of range with a 400 before touching the database.
export function parseNearParams(
  lat?: string,
  lng?: string,
  radiusKm?: string,
): NearParams {
  const parsed = {
    lat: Number(lat),
    lng: Number(lng),
    radiusKm: Number(radiusKm),
  };

  if (!lat || Number.isNaN(parsed.lat) || parsed.lat < -90 || parsed.lat > 90) {
    throw new BadRequestException('lat must be a number between -90 and 90');
  }
  if (!lng || Number.isNaN(parsed.lng) || parsed.lng < -180 || parsed.lng > 180) {
    throw new BadRequestException('lng must be a number between -180 and 180');
  }
  if (
    !radiusKm ||
    Number.isNaN(parsed.radiusKm) ||
    parsed.radiusKm <= 0 ||
    parsed.radiusKm > MAX_RADIUS_KM
  ) {
    throw new BadRequestException(
      `radius_km must be a number above 0 and at most ${MAX_RADIUS_KM}`,
    );
  }
  return parsed;
}

// Adds the PostGIS part of the query: keep rows whose `location` is within
// the radius (ST_DWithin), work out each row's distance (ST_Distance), and
// sort nearest first. On geography columns both functions use metres.
export function applyNear<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  near: NearParams,
): SelectQueryBuilder<T> {
  const point = 'ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography';
  return qb
    .addSelect(`ST_Distance(${alias}.location, ${point}) / 1000`, 'distance_km')
    .where(`ST_DWithin(${alias}.location, ${point}, :radiusMeters)`)
    .setParameters({
      lat: near.lat,
      lng: near.lng,
      radiusMeters: near.radiusKm * 1000,
    })
    .orderBy('distance_km', 'ASC');
}

// Runs the query and returns each row with its distance attached,
// rounded to 10 metres (e.g. 3.42 km).
export async function withDistance<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
): Promise<(T & { distance_km: number })[]> {
  const { entities, raw } = await qb.getRawAndEntities();
  return entities.map((entity, i) => ({
    ...entity,
    distance_km: Math.round(Number(raw[i].distance_km) * 100) / 100,
  }));
}
