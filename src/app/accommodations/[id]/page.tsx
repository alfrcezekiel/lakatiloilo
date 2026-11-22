import type { Metadata } from "next";
import { cache, type ReactNode } from "react";
import { Mail, Navigation, Phone } from "lucide-react";
import { categoryName, getAccommodation, getCategories } from "@/lib/api";
import type { Accommodation } from "@/lib/api";
import { accommodationTypeLabels, locationLabels, renamedCategories } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { metaDescription } from "@/lib/meta-description";
import { ReviewsSection } from "@/components/ReviewsSection";
import { Reveal } from "@/components/Reveal";
import { PlaceReviewsProvider, RatingFact } from "@/components/PlaceReviews";
import { LivePlace } from "@/components/LivePlace";
import { PlaceMap } from "@/components/PlaceMap";
import { SectionTabs } from "@/components/PlaceDetailClient";
import {
  directionsUrl,
  Fact,
  KeepExploring,
  PageGlow,
  PanelFact,
  PlaceBody,
  PlaceHero,
  PlaceNav,
  PlacePhotosSection,
  PlaceNotFound,
  QuickFacts,
  SectionHeading,
  SidePanel,
  tones,
  type PanelAction,
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
// apart (evaluation B2, 2026-11-04; WCAG 2.4.2 Page Titled). It also gives
// search engines a summary of the place (Lighthouse SEO, 2026-11-18).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { accommodation, failed } = await load((await params).id);
  if (accommodation) {
    return {
      title: `${accommodation.name} · Lakat Iloilo`,
      // The summary search results show under the title (SEO).
      description: metaDescription(accommodation.description, accommodation.name),
    };
  }
  return { title: failed ? "Lakat Iloilo" : "Accommodation not found · Lakat Iloilo" };
}

// A contact card in the Contact section: a real link (tel: opens the phone
// dialer, mailto: the email app) styled as a glass card.
function ContactCard({
  href,
  label,
  value,
  icon,
  main = false,
}: {
  href: string;
  label: string;
  value: string;
  icon: ReactNode;
  main?: boolean;
}) {
  return (
    <a
      href={href}
      className="glass flex min-w-0 items-center gap-3.5 rounded-[20px] border border-white/20 bg-white/10 p-5 text-white transition duration-200 hover:border-white/45 motion-safe:hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-12 shrink-0 items-center justify-center rounded-2xl [&_svg]:size-5",
          main ? "bg-accent text-accent-foreground" : "bg-white/18 text-white",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] text-white/80">{label}</span>
        <span className="block wrap-break-word text-[17px] font-semibold">{value}</span>
      </span>
    </a>
  );
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
  const photoCount = accommodation.photos?.length ?? 0;
  // Number(): a database decimal can arrive as a string.
  const latitude = Number(accommodation.latitude);
  const longitude = Number(accommodation.longitude);
  const telHref = accommodation.phone ? `tel:${accommodation.phone.replace(/[^\d+]/g, "")}` : null;
  const mailHref = accommodation.email ? `mailto:${accommodation.email}` : null;

  // Glass detail pages round (2026-11-22): the "Accommodation detail —
  // desktop" design. The one main action is calling the front desk; with
  // no phone it is emailing; with neither, directions.
  const directions: PanelAction = {
    label: "Get directions",
    href: directionsUrl(latitude, longitude),
    icon: <Navigation aria-hidden="true" />,
    external: true,
  };
  const call: PanelAction | null = telHref
    ? { label: "Call the front desk", href: telHref, icon: <Phone aria-hidden="true" /> }
    : null;
  const email: PanelAction | null = mailHref
    ? { label: "Email the front desk", href: mailHref, icon: <Mail aria-hidden="true" /> }
    : null;
  const primary = call ?? email ?? directions;
  const secondary = call ? (email ?? directions) : email ? directions : undefined;

  const tabs = [
    { id: "overview", label: "Overview" },
    ...(photoCount > 0 ? [{ id: "photos", label: "Photos" }] : []),
    ...(hasContact ? [{ id: "contact", label: "Contact" }] : []),
    { id: "location", label: "Location" },
    { id: "reviews", label: "Reviews" },
  ];
  // Numbered section labels ("03 — Contact") follow the sections shown.
  const number = (id: string) => String(tabs.findIndex((t) => t.id === id) + 1).padStart(2, "0");

  return (
    <main className={cn("relative min-h-screen overflow-hidden", tones.accommodation.page)}>
      <PageGlow tone="accommodation" />
      <PlaceNav
        tone="accommodation"
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Stays", href: "/#accommodation-list" },
          { label: type, href: "/#accommodation-list" },
          { label: accommodation.name },
        ]}
      />
      <PlaceHero
        tone="accommodation"
        photoUrl={accommodation.photo_url}
        name={accommodation.name}
        chips={[type, area]}
        address={accommodation.address}
        photoCredit={accommodation.photo_credit}
        photoCount={photoCount}
      />

      <PlaceReviewsProvider placeType="accommodation" placeId={accommodation.id}>
        {/* Live updates: this page refreshes when the place changes (ticket 91). */}
        <LivePlace placeType="accommodation" placeId={accommodation.id} />
        <QuickFacts>
          <Fact label="Type">{type}</Fact>
          <Fact label="Area">{area}</Fact>
          <RatingFact />
          <Fact label="Front desk">
            {accommodation.phone && accommodation.email
              ? "Call or email"
              : accommodation.phone
                ? "Call"
                : accommodation.email
                  ? "Email"
                  : <span className="font-normal text-white/80">No contact listed</span>}
          </Fact>
        </QuickFacts>
        <SectionTabs tone="accommodation" tabs={tabs} />
        <PlaceBody
          main={
            <>
              <Reveal>
                <section id="overview" className="scroll-mt-36">
                  <SectionHeading eyebrow={`${number("overview")} — About`}>About</SectionHeading>
                  <p className="max-w-[68ch] text-lg leading-relaxed text-white/90">{accommodation.description}</p>
                </section>
              </Reveal>
              {/* Its other allowed photos (ticket 146). */}
              <PlacePhotosSection
                name={accommodation.name}
                photos={accommodation.photos}
                eyebrow={`${number("photos")} — Gallery`}
              />
              {hasContact && (
                <Reveal>
                  <section id="contact" className="scroll-mt-36" aria-labelledby="contact-heading">
                    <SectionHeading id="contact-heading" eyebrow={`${number("contact")} — Contact`}>
                      Book with the front desk
                    </SectionHeading>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {telHref && accommodation.phone && (
                        <ContactCard href={telHref} label="Phone" value={accommodation.phone} icon={<Phone />} main />
                      )}
                      {mailHref && accommodation.email && (
                        <ContactCard href={mailHref} label="Email" value={accommodation.email} icon={<Mail />} />
                      )}
                    </div>
                  </section>
                </Reveal>
              )}
              <Reveal>
                <section id="location" className="scroll-mt-36" aria-labelledby="location-heading">
                  <SectionHeading id="location-heading" eyebrow={`${number("location")} — Location`}>
                    What&apos;s around
                  </SectionHeading>
                  <PlaceMap
                    tone="accommodation"
                    name={accommodation.name}
                    address={accommodation.address}
                    latitude={latitude}
                    longitude={longitude}
                  />
                </section>
              </Reveal>
            </>
          }
          aside={
            <div className="space-y-4">
              <SidePanel
                eyebrow={hasContact ? "Get in touch" : "Where to find it"}
                title={hasContact ? "Talk to the front desk directly" : accommodation.name}
                primary={primary}
                secondary={secondary}
              >
                <PanelFact label="Address">{accommodation.address}</PanelFact>
                {accommodation.phone && <PanelFact label="Phone">{accommodation.phone}</PanelFact>}
                {accommodation.email && <PanelFact label="Email">{accommodation.email}</PanelFact>}
              </SidePanel>
              <KeepExploring
                tone="accommodation"
                links={[
                  { label: "More places to stay", hint: `Compare stays in ${area}`, href: "/#accommodation-list" },
                  { label: `Things to see in ${area}`, hint: "Heritage, food, nature and more", href: "/#explore-categories" },
                ]}
              />
            </div>
          }
          reviews={
            <div id="reviews" className="scroll-mt-36">
              <ReviewsSection eyebrow={`${number("reviews")} — Guests say`} />
            </div>
          }
        />
      </PlaceReviewsProvider>
    </main>
  );
}
