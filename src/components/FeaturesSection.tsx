import { Hotel, LockOpen, MapPin, Mountain, Search, Smartphone, Star } from "lucide-react";

// What the site does, as one list. Each card has an icon, a title and a
// short text; adding or changing a card means editing one entry here.
const features = [
  {
    icon: Mountain,
    title: "Browse Destinations",
    text: "Explore mountain and hiking spots across Iloilo Province with detailed information, photos, and descriptions to help you plan your adventure.",
  },
  {
    icon: Hotel,
    title: "Find Accommodations",
    text: "Discover hotels and condominiums in Iloilo with contact information, making it easy to find the perfect place to stay during your trip.",
  },
  {
    icon: Star,
    title: "Reviews & Ratings",
    text: "See what other travelers think. Every destination and stay shows its average star rating and reviews — and with a free account you can rate places 1 to 5 stars and share your own tips.",
  },
  {
    icon: Smartphone,
    title: "Mobile Friendly",
    text: "Access the platform from any device with our responsive design, ensuring a smooth experience whether you're on a phone, tablet, or desktop.",
  },
  {
    icon: Search,
    title: "Detailed Information",
    text: "View comprehensive details for each destination and accommodation, including addresses, photos, descriptions, and contact information.",
  },
  {
    icon: LockOpen,
    title: "Browse Freely, Log In Only to Review",
    text: "Explore every destination and accommodation without an account. You only need to log in when you want to write, edit or delete a review.",
  },
  {
    icon: MapPin,
    title: "Centralized Information",
    text: "All Iloilo tourism information in one place. No more jumping between multiple websites, Facebook pages, and booking platforms.",
  },
];

export function FeaturesSection() {
  return (
    <div className="py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Discover Iloilo with Ease
          </h2>
          <p className="text-lg text-white/90 max-w-3xl mx-auto">
            Discover what our centralized tourism platform offers to help you explore Iloilo with ease.
          </p>
        </div>

        {/* A wrapping row instead of a grid, so a last row with fewer cards
            sits in the middle: 1 column on phones, 2 on tablets, 3 on
            desktops. The widths subtract the 1.5rem gap between cards. */}
        <ul className="flex flex-wrap justify-center gap-6">
          {features.map((feature) => (
            <li
              key={feature.title}
              className="w-full md:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)] bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-6"
            >
              <feature.icon aria-hidden="true" strokeWidth={1.75} className="size-10 mb-4 text-white" />
              <h3 className="text-xl font-semibold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-white/90 leading-relaxed">{feature.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
