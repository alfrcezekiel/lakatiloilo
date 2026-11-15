import type { Metadata } from "next";
import { cache } from "react";
import { Mail, Phone } from "lucide-react";
import { categoryName, getAccommodation, getCategories } from "@/lib/api";
import { pillButton } from "@/components/ui/button";
import type { Accommodation } from "@/lib/api";
import { accommodationTypeLabels, locationLabels, renamedCategories } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { ReviewsSection } from "@/components/ReviewsSection";
import { Reveal } from "@/components/Reveal";
import { PlaceReviewsProvider, RatingTile } from "@/components/PlaceReviews";
import { LivePlace } from "@/components/LivePlace";
import {
  PanelFact,
  PlaceBody,
  PlaceHero,
  PlacePhotosSection,
  PlaceNotFound,
  SectionHeading,
  SidePanel,
  StatTile,
  tones,
} from "@/components/PlaceDetail";

// cache(): the tab title (generateMetadata) and the page both need the
// accommodation, and share one backend answer per visit (like the traveler page).
// failed: the backend could not be reached, as opposed to "no such place".
const load = cache(async (id: string): Promise<{ accommodation: Accommodation | null; failed: boolean }> => {
  try {
    return { accommodation: await getAccommodation(id), failed: false };
  } catch {
    return { accommodation: null, failed: true };
  }
});

// The tab names the place, so travelers (and screen readers) can tell tabs
// apart (evaluation B2, 2026-11-04; WCAG 2.4.2 Page Titled).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { accommodation, failed } = await load((await params).id);
  if (accommodation) return { title: `${accommodation.name} · Lakat Iloilo` };
  return { title: failed ? "Lakat Iloilo" : "Accommodation not found · Lakat Iloilo" };
}

export default async function AccommodationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { accommodation, failed } = await load((await params).id);
  if (!accommodation) {
    return <PlaceNotFound tone="accommodation" what="Accommodation" failed={failed} />;
  }

  // A kind the team added from the dashboard (ticket 117) is named in the
  // categories list, not in the built-in labels.
  // A built-in one the team renamed (ticket 141) shows its new name.
  const renamed = renamedCategories(await getCategories().catch(() => []));
  const type =
    renamed[accommodation.type] ??
    accommodationTypeLabels[accommodation.type] ??
    (await categoryName(accommodation.type));
  const area = locationLabels[accommodation.location_type] ?? accommodation.location_type;
  const hasContact = Boolean(accommodation.phone || accommodation.email);

  return (
    <main className={cn("min-h-screen", tones.accommodation.page)}>
      <PlaceHero
        tone="accommodation"
        photoUrl={accommodation.photo_url}
        name={accommodation.name}
        chips={[type, area]}
        address={accommodation.address}
        photoCredit={accommodation.photo_credit}
      />

      <PlaceReviewsProvider placeType="accommodation" placeId={accommodation.id}>
        {/* Live updates: this page refreshes when the place changes (ticket 91). */}
        <LivePlace placeType="accommodation" placeId={accommodation.id} />
        <PlaceBody
          main={
            <>
              <Reveal className="grid grid-cols-3 gap-2 sm:gap-3">
                <StatTile label="Type">{type}</StatTile>
                <StatTile label="Area">{area}</StatTile>
                <RatingTile />
              </Reveal>
              <Reveal>
                <section>
                  <SectionHeading>About</SectionHeading>
                  <p className="text-white/90 leading-relaxed">{accommodation.description}</p>
                </section>
              </Reveal>
              {/* Its other allowed photos (ticket 146). */}
              <PlacePhotosSection name={accommodation.name} photos={accommodation.photos} />
            </>
          }
          aside={
            <SidePanel
              eyebrow={hasContact ? "Get in touch" : "Where to find it"}
              title={hasContact ? "Talk to the front desk directly" : accommodation.name}
            >
              {/* Real links styled as buttons: tel: opens the phone dialer
                  and mailto: opens the email app. */}
              {hasContact && (
                <div className="space-y-2.5">
                  {accommodation.phone && (
                    <a
                      href={`tel:${accommodation.phone.replace(/[^\d+]/g, "")}`}
                      className={cn(pillButton({ kind: "main" }), "w-full")}
                    >
                      <Phone aria-hidden="true" />
                      Call {accommodation.phone}
                    </a>
                  )}
                  {accommodation.email && (
                    <a
                      href={`mailto:${accommodation.email}`}
                      className={cn(pillButton({ kind: "glass" }), "w-full")}
                    >
                      <Mail aria-hidden="true" />
                      Email the front desk
                    </a>
                  )}
                </div>
              )}
              <div className={cn("space-y-4", hasContact && "border-t border-white/15 pt-4")}>
                <PanelFact label="Address">{accommodation.address}</PanelFact>
                {accommodation.phone && <PanelFact label="Phone">{accommodation.phone}</PanelFact>}
                {accommodation.email && <PanelFact label="Email">{accommodation.email}</PanelFact>}
              </div>
            </SidePanel>
          }
          reviews={<ReviewsSection />}
        />
      </PlaceReviewsProvider>
    </main>
  );
}
