import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { QueryFailedError, type QueryRunner } from 'typeorm';
import { SupabaseService } from '../../supabase/supabase.service';
import { TravelerTransactions } from '../traveler-transactions';
import { notYours } from './reviews.service';
import { VIDEO_BUCKET } from './review-videos.bucket';

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB, the same as the bucket (065)
export const VIDEO_MESSAGE = 'Please choose an MP4, MOV or WebM video up to 50 MB and 60 seconds.';
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
// "<user id>/<random id>.<mp4|mov|webm>", the same shape the database
// trigger accepts (065).
const VIDEO_PATH = /^([0-9a-f-]{36})\/([0-9a-f-]{36}\.(?:mp4|mov|webm))$/;

const videoNotFound = () =>
  new NotFoundException("We couldn't find that video. Please upload it again.");

// A review's video (ticket 165, reviews & media round). The browser uploads
// the file straight into the traveler's own folder in the review-videos
// bucket (Vercel refuses requests over 4.5 MB, so it can't come through
// here); then it asks this service to attach it. Everything here runs as the
// logged-in traveler (their login is sent to Storage, and the database work
// goes through TravelerTransactions), so the Storage policies and Row Level
// Security decide (supabase/sql/065). The backend never uses the
// service_role key. The video is never changed: it is stored exactly as
// uploaded.
@Injectable()
export class ReviewVideosService {
  private readonly logger = new Logger(ReviewVideosService.name);

  constructor(
    private readonly travelerTransactions: TravelerTransactions,
    private readonly supabase: SupabaseService,
  ) {}

  // The public address of a stored video, or null.
  urlOf(path: string | null | undefined): string | null {
    return path ? this.supabase.publicFileUrl(VIDEO_BUCKET, path) : null;
  }

  // Attaches an uploaded video to the traveler's own review (POST
  // /v1/reviews/:id/video):
  //   1. The path must be in their own folder and shaped like one of ours.
  //   2. The file must be there, a video of an allowed type, up to 50 MB
  //      (the bucket refuses others too; checked again here).
  //   3. The review must be theirs; video_path is saved (the database checks
  //      the folder again, 065). An older video is then deleted.
  async attach(accessToken: string, reviewId: string, path: unknown): Promise<{ video_url: string }> {
    const userId = await this.supabase.userIdFor(accessToken);
    if (!userId) throw new UnauthorizedException('Please log in again, then try again.');
    const match = typeof path === 'string' ? path.match(VIDEO_PATH) : null;
    if (!match || match[1] !== userId) throw new BadRequestException(VIDEO_MESSAGE);

    const file = await this.findFile(accessToken, match[1], match[2]);
    if (!file) throw videoNotFound();
    if (!VIDEO_TYPES.includes(file.mimetype ?? '') || (file.size ?? Infinity) > MAX_VIDEO_BYTES) {
      await this.removeFile(accessToken, path as string);
      throw new BadRequestException(VIDEO_MESSAGE);
    }

    const before = await this.asTraveler(accessToken, async (runner) => {
      const old = await this.lockOwnReview(runner, reviewId);
      await runner.query('update public.reviews set video_path = $1 where id = $2 and user_id = auth.uid()', [
        path,
        reviewId,
      ]);
      return old;
    });
    if (before && before !== path) await this.removeFile(accessToken, before);
    return { video_url: this.urlOf(path as string)! };
  }

  // Removes the video from the traveler's own review (DELETE
  // /v1/reviews/:id/video) and deletes the file. No video: nothing to do.
  async detach(accessToken: string, reviewId: string): Promise<void> {
    const before = await this.asTraveler(accessToken, async (runner) => {
      const old = await this.lockOwnReview(runner, reviewId);
      await runner.query('update public.reviews set video_path = null where id = $1 and user_id = auth.uid()', [
        reviewId,
      ]);
      return old;
    });
    if (before) await this.removeFile(accessToken, before);
  }

  // The traveler's own review's current video path, with the row locked
  // until the transaction ends (so two saves at once can't both win).
  // Someone else's review, or none: "not found among yours".
  private async lockOwnReview(runner: QueryRunner, reviewId: string): Promise<string | null> {
    const rows: { video_path: string | null }[] = await runner.query(
      'select video_path from public.reviews where id = $1 and user_id = auth.uid() for update',
      [reviewId],
    );
    if (rows.length === 0) throw notYours();
    return rows[0].video_path;
  }

  // Deletes a video file as the traveler. Never fails the request: a
  // leftover file is only logged.
  async removeFile(accessToken: string, path: string): Promise<void> {
    try {
      const { error } = await this.supabase.travelerClient(accessToken).storage.from(VIDEO_BUCKET).remove([path]);
      if (error) this.logger.warn(`Could not delete review video ${path}: ${error.message}`);
    } catch (error) {
      this.logger.warn(`Could not delete review video ${path}: ${String(error)}`);
    }
  }

  // The uploaded file's size and type, as Storage records them, or null.
  private async findFile(accessToken: string, folder: string, name: string) {
    const { data, error } = await this.supabase
      .travelerClient(accessToken)
      .storage.from(VIDEO_BUCKET)
      .list(folder, { search: name, limit: 5 });
    if (error) {
      this.logger.error(`Could not look up a review video: ${error.message}`);
      throw new ServiceUnavailableException("We couldn't check your video. Please try again.");
    }
    const found = (data ?? []).find((item) => item.name === name);
    if (!found) return null;
    const metadata = (found.metadata ?? {}) as { size?: number; mimetype?: string };
    return { size: metadata.size, mimetype: metadata.mimetype };
  }

  private asTraveler<T>(accessToken: string, work: (runner: QueryRunner) => Promise<T>): Promise<T> {
    return this.travelerTransactions.run(accessToken, work, (error) => this.toHttpError(error));
  }

  // Turns a database refusal into a plain answer.
  private toHttpError(error: unknown) {
    if (error instanceof HttpException) return error;
    const code =
      error instanceof QueryFailedError
        ? (error.driverError as { code?: string } | undefined)?.code
        : undefined;
    // Not their own folder (the trigger in 065).
    if (code === '42501') return new BadRequestException(VIDEO_MESSAGE);
    this.logger.error(`Could not save a review video: ${String(error)}`);
    return new ServiceUnavailableException('Something went wrong. Please try again.');
  }
}
