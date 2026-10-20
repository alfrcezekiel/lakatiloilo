import { ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { categoryChips } from "@/components/CategoryChips";

const locationOptions = [
  { id: "all", label: "All" },
  { id: "iloilo_city", label: "Iloilo City" },
  { id: "iloilo_province", label: "Province" },
];

interface SearchBarProps {
  // The category and location live on the home page, so the chips, this
  // bar and the filter further down always show the same choice.
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedLocation: string;
  onLocationChange: (location: string) => void;
  onExplore: () => void;
}

export function SearchBar({
  selectedCategory,
  onCategoryChange,
  selectedLocation,
  onLocationChange,
  onExplore,
}: SearchBarProps) {
  return (
    // A form, so pressing Enter in "Where to?" works like clicking Explore.
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onExplore();
      }}
      className="mb-6 flex flex-col gap-2 rounded-3xl border border-white/25 bg-white/10 p-2 shadow-2xl backdrop-blur-xl lg:flex-row lg:items-center lg:rounded-full"
    >
      {/* Where to? */}
      <div className="flex min-w-0 items-center gap-3 rounded-2xl lg:flex-[3] px-4 py-2 lg:rounded-full lg:pl-6">
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
            className="h-auto border-0 bg-transparent p-0 text-base text-white placeholder:text-white/70 focus-visible:ring-0 focus-visible:ring-offset-0 md:text-base"
          />
        </div>
      </div>

      <div aria-hidden="true" className="hidden h-12 w-px bg-white/25 lg:block" />

      {/* Category: a plain select, so it works with keyboard and screen
          readers for free. It uses the same list as the chips. */}
      <div className="relative min-w-0 rounded-2xl px-4 py-2 lg:flex-[2] lg:rounded-full">
        <Label
          htmlFor="search-category"
          className="text-[11px] font-semibold uppercase tracking-widest text-white/70"
        >
          Category
        </Label>
        <select
          id="search-category"
          value={selectedCategory}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="block w-full cursor-pointer appearance-none bg-transparent pr-8 text-base text-white focus-visible:outline-none"
        >
          {categoryChips.map((chip) => (
            <option key={chip.id} value={chip.id} className="text-teal-950">
              {chip.id === "all" ? "All categories" : chip.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-4 bottom-3 size-4 text-white/70"
        />
      </div>

      <div aria-hidden="true" className="hidden h-12 w-px bg-white/25 lg:block" />

      {/* Location: the same filter as the one further down the page. */}
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
              onClick={() => onLocationChange(option.id)}
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
