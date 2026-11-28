import type { Metadata } from "next";
import { FaqsPage } from "@/components/FaqsPage";
import { getFaqs, type Faq } from "@/lib/api";

// The FAQs page (/faqs, FAQs round, ticket 173; team request 2026-11-28):
// every shown question, grouped under its topic.

// Asked again on every visit (and on every live update), so the team's
// changes show without a new build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Frequently asked questions · Lakat Iloilo",
  description: "Answers for travelers new to Iloilo or to Lakat Iloilo, grouped by topic.",
};

// Runs on the Next.js server and asks the backend (GET /v1/faqs). It never
// fails: if the backend cannot be reached, the page says so.
async function loadFaqs(): Promise<{ faqs: Faq[]; failed: boolean }> {
  try {
    return { faqs: await getFaqs(), failed: false };
  } catch {
    return { faqs: [], failed: true };
  }
}

export default async function Page() {
  const { faqs, failed } = await loadFaqs();
  return <FaqsPage faqs={faqs} failed={failed} />;
}
