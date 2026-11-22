import { Film } from "lucide-react";
import type { ReviewPhoto } from "@/lib/api";
import { ReviewPhotos } from "@/components/ReviewPhoto";
import { ReviewVideo } from "@/components/ReviewVideo";

// A review's photos and video on the dashboard's Reviews and Reports
// screens (ticket 166). Shared by both screens so they can't drift apart:
// the video once showed only when the review also had photos (team report
// 2026-11-22), because each screen kept both inside one "has photos" check.
export function AdminReviewMedia({
  photos,
  videoUrl,
  reviewerName,
}: {
  photos: ReviewPhoto[];
  videoUrl: string | null | undefined;
  reviewerName: string;
}) {
  if (photos.length === 0 && !videoUrl) return null;
  return (
    <div className="mt-3 space-y-3">
      {photos.length > 0 && <ReviewPhotos photos={photos} reviewerName={reviewerName} />}
      <ReviewVideo url={videoUrl} reviewerName={reviewerName} />
    </div>
  );
}

// A small "Video" tag beside Visible / Hidden and the reports, so the team
// sees at a glance that a review has a video to check.
export function VideoTag({ videoUrl }: { videoUrl: string | null | undefined }) {
  if (!videoUrl) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/60 px-2.5 py-0.5 text-xs font-semibold text-sky-200">
      <Film aria-hidden="true" className="size-3.5" />
      Video
    </span>
  );
}
