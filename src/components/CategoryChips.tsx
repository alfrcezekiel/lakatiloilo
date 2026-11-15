import { categoryChips, type ExtraCategory } from "@/lib/labels";

interface CategoryChipsProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  // Categories and kinds the team added (ticket 117), after the built-in
  // chips.
  extras?: ExtraCategory[];
  // Built-in ones the team renamed (ticket 141): id -> new name.
  renamed?: Record<string, string>;
}

export function CategoryChips({
  selectedCategory,
  onCategoryChange,
  extras = [],
  renamed = {},
}: CategoryChipsProps) {
  const chips = [
    ...categoryChips.map((chip) => ({ ...chip, label: renamed[chip.id] ?? chip.label })),
    ...extras.map((extra) => ({ id: extra.id, label: extra.name })),
  ];
  return (
    <div className="mb-12 flex flex-wrap gap-2 sm:gap-3">
      {chips.map((chip) => {
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
