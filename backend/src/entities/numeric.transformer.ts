import { ValueTransformer } from 'typeorm';

// Postgres `numeric` columns reach Node as strings ("10.72") so no
// precision is lost. Coordinates fit safely in a JS number, so the API
// returns them as numbers, the same as Supabase did.
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value == null ? null : Number(value)),
};
