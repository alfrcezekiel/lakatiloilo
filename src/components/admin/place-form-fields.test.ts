import { describe, expect, it } from "vitest";
import { EMPTY_FIELDS, check } from "./place-form-fields";

const fields = (description: string) => ({
  ...EMPTY_FIELDS,
  name: "Breakthrough Restaurant",
  description,
  address: "Villa de Arevalo, Iloilo City",
  kind: "food",
  location_type: "iloilo_city",
  latitude: "10.6798",
  longitude: "122.5173",
});

describe("place form: description length (team request 2026-11-28)", () => {
  it("allows up to 3000 characters", () => {
    expect(check(fields("a".repeat(3000)), false).description).toBeUndefined();
  });

  it("refuses 3001 characters under the field", () => {
    expect(check(fields("a".repeat(3001)), false).description).toBe(
      "Please keep the description to 3000 characters.",
    );
  });

  it("does not count spaces at the ends", () => {
    expect(check(fields(`  ${"a".repeat(3000)}  `), true).description).toBeUndefined();
  });
});
