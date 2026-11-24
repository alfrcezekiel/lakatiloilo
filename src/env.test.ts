import { afterEach, describe, expect, it, vi } from "vitest";
import { checkEnv, env, maybe } from "./env";

// The environment variable checks (src/env.ts). Every value is pretend.
const allSet = () => {
  vi.stubEnv("NEXT_PUBLIC_APP_ENV", "staging");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://pretend-project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "pretend-anon-key");
  vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", "pk.pretend");
  vi.stubEnv("API_URL", "http://backend.example.test");
};

afterEach(() => vi.unstubAllEnvs());

describe("checkEnv", () => {
  it("passes when every required variable is set, without MAINTENANCE_MODE", () => {
    allSet();

    expect(() => checkEnv()).not.toThrow();
  });

  it("lists every missing or empty variable in one error", () => {
    allSet();
    vi.stubEnv("API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", undefined);

    expect(() => checkEnv()).toThrow(/NEXT_PUBLIC_MAPBOX_TOKEN is missing[\s\S]*API_URL is missing/);
  });

  it("refuses a value of the wrong shape", () => {
    allSet();
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "prod");

    expect(() => checkEnv()).toThrow(/NEXT_PUBLIC_APP_ENV is not valid/);
  });
});

describe("env", () => {
  it("reads MAINTENANCE_MODE as on only for the word true", () => {
    vi.stubEnv("MAINTENANCE_MODE", "true");
    const on = env.MAINTENANCE_MODE;
    vi.stubEnv("MAINTENANCE_MODE", undefined);

    expect(on).toBe(true);
    expect(env.MAINTENANCE_MODE).toBe(false);
  });

  it("knows the staging site", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_ENV", "staging");

    expect(env.isStaging).toBe(true);
  });

  it("answers undefined through maybe() when a value is missing", () => {
    vi.stubEnv("API_URL", "");

    expect(maybe(() => env.API_URL)).toBeUndefined();
    expect(() => env.API_URL).toThrow(/API_URL is missing/);
  });
});
