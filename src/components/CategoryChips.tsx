// The chip ids match the `category` column of destinations and the `type`
// column of accommodations, so the home page can filter with them directly.
export const categoryChips = [
  { id: "all", label: "All" },
  { id: "mountain", label: "Mountains" },
  { id: "food", label: "Food" },
  { id: "festival", label: "Festivals" },
  { id: "hotel", label: "Hotels" },
  { id: "condominium", label: "Condominiums" },
  { id: "walking", label: "Walking Areas" },
  { id: "nature", label: "Nature & Parks" },
  { id: "heritage", label: "Heritage Sites" },
];

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
