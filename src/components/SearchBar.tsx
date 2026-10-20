"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { categoryChips } from "@/components/CategoryChips";
import type { Accommodation, Destination } from "@/lib/api";

const locationOptions = [
  { id: "all", label: "All" },
  { id: "iloilo_city", label: "Iloilo City" },
  { id: "iloilo_province", label: "Province" },
];

const MAX_SUGGESTIONS = 6;

// "mountain" -> "Mountains", "hotel" -> "Hotels", ... for the suggestion rows.
const categoryLabels: Record<string, string> = Object.fromEntries(
  categoryChips.map((chip) => [chip.id, chip.label]),
);

const areaLabels: Record<string, string> = {
  iloilo_city: "Iloilo City",
  iloilo_province: "Iloilo Province",
};

interface Suggestion {
  key: string;
  name: string;
  category: string;
  area: string;
  href: string;
}

interface SearchBarProps {
  // Every place the home page loaded. The bar filters them itself, with
  // its own location toggle and the category chosen with the chips.
  destinations: Destination[];
  accommodations: Accommodation[];
  // Set by the chips under the bar; only shown here, not changed.
  selectedCategory: string;
}

export function SearchBar({
  destinations,
  accommodations,
  selectedCategory,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  // The search bar's own location choice. Kept here on purpose, so it does
  // not change the location filter further down the page (or the other way
  // round).
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [isOpen, setIsOpen] = useState(false);
  // Which suggestion the arrow keys have highlighted; -1 means none.
  const [activeIndex, setActiveIndex] = useState(-1);
  // The suggestion the traveler clicked (or picked with Enter). Explore
  // opens this one.
  const [chosenKey, setChosenKey] = useState<string | null>(null);
  // True after Explore is pressed with an empty box, to show a hint.
  const [showHint, setShowHint] = useState(false);

  // Live suggestions: matched in the browser against the places the home
  // page already loaded, so typing sends no requests to the backend.
  const suggestions = useMemo<Suggestion[]>(() => {
    const text = query.trim().toLowerCase();
    if (!text) return [];

    const inCategory = (category: string) =>
      selectedCategory === "all" || selectedCategory === category;
    const inLocation = (locationType: string) =>
      selectedLocation === "all" || selectedLocation === locationType;
    const matches = (place: { name: string; address: string }) =>
      place.name.toLowerCase().includes(text) ||
      place.address.toLowerCase().includes(text);

    const all: Suggestion[] = [
      ...destinations
        .filter(
          (d) =>
            inCategory(d.category) && inLocation(d.location_type) && matches(d),
        )
        .map((d) => ({
          key: `d-${d.id}`,
          name: d.name,
          category: d.category,
          area: d.location_type,
          href: `/destinations/${d.id}`,
        })),
      ...accommodations
        .filter(
          (a) => inCategory(a.type) && inLocation(a.location_type) && matches(a),
        )
        .map((a) => ({
          key: `a-${a.id}`,
          name: a.name,
          category: a.type,
          area: a.location_type,
          href: `/accommodations/${a.id}`,
        })),
    ];

    // Names that start with what was typed come first: "din" puts
    // "Dinagyang Festival" above a place that merely contains "din".
    const startsWith = (s: Suggestion) =>
      s.name.toLowerCase().startsWith(text) ? 0 : 1;
    return all
      .sort((a, b) => startsWith(a) - startsWith(b))
      .slice(0, MAX_SUGGESTIONS);
  }, [query, destinations, accommodations, selectedCategory, selectedLocation]);

  const showDropdown = isOpen && (query.trim() !== "" || showHint);

  // Picking a suggestion only fills the box; Explore then opens it.
  const chooseSuggestion = (suggestion: Suggestion) => {
    setQuery(suggestion.name);
    setChosenKey(suggestion.key);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const focusSearchBox = () => document.getElementById("search-where")?.focus();

  const handleExplore = () => {
    if (query.trim() === "") {
      setShowHint(true);
      setIsOpen(true);
      focusSearchBox();
      return;
    }
    // The chosen place if it still fits the filters, otherwise the best
    // match for what was typed.
    const target =
      suggestions.find((s) => s.key === chosenKey) ?? suggestions[0];
    if (target) {
      router.push(target.href);
    } else {
      // Nothing matches: open the list so it can say "No matches".
      setIsOpen(true);
      focusSearchBox();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (suggestions.length === 0) return;
      event.preventDefault();
      setIsOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      // Wraps around: down from the last goes back to the first.
      setActiveIndex(
        (index) => (index + step + suggestions.length) % suggestions.length,
      );
    } else if (event.key === "Enter" && showDropdown && activeIndex >= 0) {
      // Pick the highlighted place instead of submitting the form.
      event.preventDefault();
      chooseSuggestion(suggestions[activeIndex]);
    } else if (event.key === "Escape" && showDropdown) {
      // Only swallow Escape when it closes our list, so a second press
      // still clears the search box as browsers normally do.
      event.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    // A form, so pressing Enter in "Where to?" works like clicking Explore.
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        handleExplore();
      }}
      // relative z-20 keeps the suggestions dropdown above the cards below.
      className="relative z-20 mb-6 flex flex-col gap-2 rounded-3xl border border-white/25 bg-white/10 p-2 shadow-2xl backdrop-blur-xl lg:flex-row lg:items-center lg:rounded-full"
    >
      {/* Where to? */}
      <div className="relative flex min-w-0 items-center gap-3 rounded-2xl px-4 py-2 lg:flex-[3] lg:rounded-full lg:pl-6">
        <Search aria-hidden="true" className="size-5 shrink-0 text-white/90" />
        <div className="min-w-0 flex-1">
          <Label
            htmlFor="search-where"
            className="text-[11px] font-semibold uppercase tracking-widest text-white/70"
          >
            Where to?
          </Label>
          <Input
            id="search-where"
            type="search"
            autoComplete="off"
            placeholder="Search destinations, food, stays"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
              setActiveIndex(-1);
              setChosenKey(null);
              setShowHint(false);
            }}
            onFocus={() => setIsOpen(true)}
            // Clicking anywhere else moves focus away, which closes the list.
            onBlur={() => setIsOpen(false)}
            onKeyDown={handleKeyDown}
            // These tell screen readers this box has a suggestion list and
            // which suggestion is highlighted.
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-controls="search-suggestions"
            aria-activedescendant={
              showDropdown && activeIndex >= 0
                ? `search-suggestion-${activeIndex}`
                : undefined
            }
            className="h-auto border-0 bg-transparent p-0 text-base text-white placeholder:text-white/70 focus-visible:ring-0 focus-visible:ring-offset-0 md:text-base"
          />
        </div>

        {showDropdown && (
          // z-10 keeps the list above the Category field, which sits right
          // below it when the bar is stacked on a phone.
          <div className="absolute top-full left-0 z-10 mt-3 w-full overflow-hidden rounded-2xl border border-white/20 bg-teal-950/95 shadow-2xl backdrop-blur-xl sm:w-[28rem]">
            {query.trim() === "" ? (
              <p className="px-5 py-4 text-sm text-white/70">
                Type a place name, then pick it from the list
              </p>
            ) : suggestions.length === 0 ? (
              <p className="px-5 py-4 text-sm text-white/70">No matches</p>
            ) : (
              <ul id="search-suggestions" role="listbox" className="py-2">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={suggestion.key}
                    id={`search-suggestion-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    // preventDefault stops the box losing focus (and the list
                    // closing) before the click lands.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => chooseSuggestion(suggestion)}
                    onMouseEnter={() => setActiveIndex(index)}
                    // On a phone the details go under the name, so long names
                    // are not cut short.
                    className={`flex cursor-pointer flex-col gap-0.5 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                      index === activeIndex ? "bg-white/15" : ""
                    }`}
                  >
                    <span className="truncate font-medium text-white">
                      {suggestion.name}
                    </span>
                    <span className="shrink-0 text-xs text-white/60">
                      {categoryLabels[suggestion.category] ?? suggestion.category}
                      {" · "}
                      {areaLabels[suggestion.area] ?? suggestion.area}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div aria-hidden="true" className="hidden h-12 w-px bg-white/25 lg:block" />

      {/* Category: shows the chip chosen below the bar. Read-only on
          purpose; the chips are the one place to change it. */}
      <div className="min-w-0 rounded-2xl px-4 py-2 lg:flex-[2] lg:rounded-full">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">
          Category
        </p>
        <p aria-live="polite" className="truncate text-base text-white">
          {selectedCategory === "all"
            ? "All categories"
            : categoryLabels[selectedCategory]}
        </p>
      </div>

      <div aria-hidden="true" className="hidden h-12 w-px bg-white/25 lg:block" />

      {/* Location: narrows the suggestions only. Separate from the filter
          further down the page. */}
      <div
        role="group"
        aria-label="Location"
        className="flex rounded-full border border-white/15 bg-teal-950/30 p-1"
      >
        {locationOptions.map((option) => {
          const isSelected = selectedLocation === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedLocation(option.id)}
              className={`flex-1 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white sm:px-5 ${
                isSelected
                  ? "bg-white text-teal-900 shadow"
                  : "text-white hover:bg-white/10"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <Button
        type="submit"
        className="h-12 rounded-full bg-white px-8 text-base font-semibold text-teal-900 shadow-lg hover:bg-white/90 hover:opacity-100 focus-visible:ring-white focus-visible:ring-offset-teal-900"
      >
        Explore
      </Button>
    </form>
  );
}
