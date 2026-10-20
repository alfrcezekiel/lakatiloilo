import { categoryChips } from "@/lib/labels";

interface CategoryChipsProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryChips({ selectedCategory, onCategoryChange }: CategoryChipsProps) {
  return (
    <div className="mb-12 flex flex-wrap gap-2 sm:gap-3">
      {categoryChips.map((chip) => {
        const isSelected = selectedCategory === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            // aria-pressed tells screen readers which chip is switched on.
            aria-pressed={isSelected}
            onClick={() => onCategoryChange(chip.id)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-5 sm:py-2.5 sm:text-base ${
              isSelected
                ? "border-white bg-white text-teal-900 shadow-lg"
                : "border-white/30 bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
            }`}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
