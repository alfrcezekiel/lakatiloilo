import { getAccommodation } from "@/lib/api";
import type { Accommodation } from "@/lib/api";
import { accommodationTypeLabels, locationLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { ReviewsSection } from "@/components/ReviewsSection";
import { Reveal } from "@/components/Reveal";
import { PlaceReviewsProvider, RatingTile } from "@/components/PlaceReviews";
import {
  PanelFact,
  PlaceBody,
  PlaceHero,
  PlaceNotFound,
  SectionHeading,
  SidePanel,
  StatTile,
  tones,
} from "@/components/PlaceDetail";

export default async function AccommodationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let accommodation: Accommodation | null = null;
  let error: Error | null = null;
  try {
    accommodation = await getAccommodation(id);
  } catch (e) {
    error = e instanceof Error ? e : new Error(String(e));
  }

  if (error || !accommodation) {
    return <PlaceNotFound tone="accommodation" what="Accommodation" message={error?.message} />;
  }

  const type = accommodationTypeLabels[accommodation.type] ?? accommodation.type;
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
      />

      <PlaceReviewsProvider placeType="accommodation" placeId={accommodation.id}>
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
                      className="flex h-11 w-full items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-indigo-900 transition-colors hover:bg-white/90"
                    >
                      Call {accommodation.phone}
                    </a>
                  )}
                  {accommodation.email && (
                    <a
                      href={`mailto:${accommodation.email}`}
                      className="flex h-11 w-full items-center justify-center rounded-lg border border-white/25 bg-white/15 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/25"
                    >
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
