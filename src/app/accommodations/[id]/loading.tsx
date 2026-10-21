import { DetailPageSkeleton } from "@/components/DetailPageSkeleton";

// Next.js shows this file straight away while page.tsx is still waiting for
// the backend, then swaps in the real page once it is ready.
export default function Loading() {
  return (
    <DetailPageSkeleton kind="accommodation" />
  );
}
