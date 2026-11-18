import { describe, expect, it } from "vitest";
import {
  accommodationTypeLabels,
  categoryChips,
  categoryLabels,
  locationLabels,
  renamedCategories,
  travelerTypeLabels,
} from "./labels";

describe("labels", () => {
  it('lists the category chips with "All" first', () => {
    expect(categoryChips[0]).toEqual({ id: "all", label: "All" });
    expect(categoryLabels.mountain).toBe("Mountains");
    expect(categoryLabels.heritage).toBe("Heritage Sites");
  });

  it("names the three kinds of traveler the way sign-up shows them", () => {
    expect(travelerTypeLabels).toEqual({
      local: "Local Ilonggo",
      domestic: "Visitor from PH",
      foreign: "Foreign tourist",
    });
  });

  it("names both locations", () => {
    expect(locationLabels).toEqual({ iloilo_city: "Iloilo City", iloilo_province: "Iloilo Province" });
  });

  it('spells "Condominium" with a hidden break point, so it fits a 320 px phone', () => {
    const label = accommodationTypeLabels.condominium;

    expect(label).toContain("­");
    expect(label.replaceAll("­", "")).toBe("Condominium");
  });
});

describe("renamedCategories", () => {
  it("gives nothing while every built-in category keeps its first name", () => {
    expect(
      renamedCategories([
        { id: "mountain", name: "Mountains" },
        { id: "food", name: "Food" },
      ]),
    ).toEqual({});
  });

  it("gives the new name of a built-in category the team renamed", () => {
    expect(renamedCategories([{ id: "mountain", name: "Bukid kag Bundok" }])).toEqual({
      mountain: "Bukid kag Bundok",
    });
  });

  it("ignores categories the team added (they are not built in)", () => {
    expect(renamedCategories([{ id: "beach", name: "Beaches" }])).toEqual({});
  });

  it("keeps accents and ñ in a new name as they are", () => {
    expect(renamedCategories([{ id: "food", name: "Pagkaon nga Ilonggo – Pancit Molo kag Batchoy ñ" }])).toEqual({
      food: "Pagkaon nga Ilonggo – Pancit Molo kag Batchoy ñ",
    });
  });
});
