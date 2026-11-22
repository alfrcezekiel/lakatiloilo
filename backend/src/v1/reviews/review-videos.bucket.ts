import type { Logger } from '@nestjs/common';
import type { SupabaseService } from '../../supabase/supabase.service';

// Review videos in Storage (tickets 165 and 166, supabase/sql/065): the
// bucket, a video's public address, and deleting video files. One place for
// all of them (code review 2026-11-23: the same lines were copied into four
// services). Its own small file so the reviews, videos and admin services
// can all use it without importing each other.
export const VIDEO_BUCKET = 'review-videos';

// The public address of a stored video, or null.
export function videoUrlOf(supabase: SupabaseService, path: string | null | undefined): string | null {
  return path ? supabase.publicFileUrl(VIDEO_BUCKET, path) : null;
}

// Deletes video files with this login (a traveler their own, an admin any;
// the Storage policies in 065 decide). Never fails the request: the rows are
// already changed, so a leftover file is only logged.
export async function removeVideoFiles(
  supabase: SupabaseService,
  accessToken: string,
  paths: string[],
  logger: Logger,
): Promise<void> {
  if (paths.length === 0) return;
  try {
    const { error } = await supabase.travelerClient(accessToken).storage.from(VIDEO_BUCKET).remove(paths);
    if (error) logger.warn(`Could not delete ${paths.length} review video(s): ${error.message}`);
  } catch (error) {
    logger.warn(`Could not delete ${paths.length} review video(s): ${String(error)}`);
  }
}
