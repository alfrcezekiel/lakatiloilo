import { getAccommodations, getCategories, getDestinations, getFaqs, getRatings } from "@/lib/api";
import { HomePage, type HomePlaces } from "@/components/HomePage";

// Ask the backend on every visit, so the page always shows the latest
// places (and the build never needs the backend to be running).
export const dynamic = "force-dynamic";

// Runs on the Next.js server: asks the NestJS backend for both lists at
// the same time. It never fails: if the backend cannot be reached, it
// answers with empty lists and failed: true, so the page can say so.
async function loadPlaces(): Promise<HomePlaces> {
  const [destinations, accommodations, ratings, categories, faqs] = await Promise.allSettled([
    getDestinations(),
    getAccommodations(),
    getRatings(),
    getCategories(),
    getFaqs(),
  ]);
  return {
    destinations: destinations.status === "fulfilled" ? destinations.value : [],
    accommodations: accommodations.status === "fulfilled" ? accommodations.value : [],
    // Ratings are extra: if they fail, the cards still show, just without
    // a rating (null), and the page does not say places failed to load.
    ratings: ratings.status === "fulfilled" ? ratings.value : null,
    // The team's categories and kinds (ticket 117). Extra too: if they
    // fail, the page shows the eight built-in ones.
    categories: categories.status === "fulfilled" ? categories.value : null,
    // The FAQs (ticket 170). Extra too: if they fail, the section is hidden.
    faqs: faqs.status === "fulfilled" ? faqs.value : null,
    failed: destinations.status === "rejected" || accommodations.status === "rejected",
  };
}

// The home page. The request to the backend starts here, on the server,
// and is handed to the page without waiting for it: the page is sent
// straight away with its skeletons, and the places follow as soon as the
// backend answers (Next.js streams them to the browser).
export default function Home() {
  return <HomePage places={loadPlaces()} />;
}
