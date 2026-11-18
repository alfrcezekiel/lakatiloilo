import { describe, expect, it } from "vitest";
import { META_DESCRIPTION_MAX, metaDescription } from "./meta-description";

describe("metaDescription", () => {
  it("uses a short description as it is", () => {
    expect(metaDescription("La Paz Batchoy is a famous noodle soup from Iloilo.", "La Paz Batchoy")).toBe(
      "La Paz Batchoy is a famous noodle soup from Iloilo.",
    );
  });

  it("tidies extra spaces and line breaks", () => {
    expect(metaDescription("  Nami gid\n\nang   batchoy.  ", "x")).toBe("Nami gid ang batchoy.");
  });

  it("shortens a long description at a whole word, with …, within the limit", () => {
    const long = "Breakthrough Restaurant serves fresh seafood by the sea in Villa Arevalo, with grilled scallops, oysters, and diwal in season, and it is busy on weekends with families from all over Iloilo.";
    const result = metaDescription(long, "Breakthrough");

    expect(result.length).toBeLessThanOrEqual(META_DESCRIPTION_MAX);
    expect(result.endsWith("…")).toBe(true);
    expect(long.startsWith(result.slice(0, -1))).toBe(true);
    expect(result).not.toMatch(/\s…$|,…$/);
  });

  it("keeps ñ and accents", () => {
    expect(metaDescription("Plaza sa Jaro, malapit sa simbahan ng Niño.", "Jaro")).toContain("Niño");
  });

  it("names the place when there is no description", () => {
    expect(metaDescription("", "Garin Farm")).toBe("Garin Farm in Iloilo, with reviews from travelers on Lakat Iloilo.");
    expect(metaDescription(null, "Garin Farm")).toContain("Garin Farm");
  });
});
