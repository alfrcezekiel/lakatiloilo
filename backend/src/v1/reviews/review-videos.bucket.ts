// Where review videos are stored (ticket 165, supabase/sql/065). Its own
// small file so the reviews service and the videos service can both use it
// without importing each other.
export const VIDEO_BUCKET = 'review-videos';
