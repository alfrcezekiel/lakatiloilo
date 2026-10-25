import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

// What the website gets for each review. Only the display name is ever
// sent, never the reviewer's email (the reviews table does not hold it).
export interface ReviewDto {
  id: string;
  user_id: string;
  reviewer_name: string;
  traveler_type: string | null;
  rating: number;
  comment: string;
  created_at: string;
}

export type PlaceType = 'destination' | 'accommodation';

const COLUMNS = 'id, user_id, reviewer_name, traveler_type, rating, comment, created_at';

// Talks to the reviews table through Supabase, so Row Level Security
// applies. The controller calls these methods.
@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  // A place's reviews, newest first. Anyone may read them (Row Level
  // Security policy "anyone can read reviews").
  async findForPlace(placeType: PlaceType, placeId: string): Promise<ReviewDto[]> {
    const { data, error } = await this.supabase
      .anonClient()
      .from('reviews')
      .select(COLUMNS)
      .eq('place_type', placeType)
      .eq('place_id', placeId)
      .order('created_at', { ascending: false });
    if (error) {
      this.logger.error(`Could not read reviews: ${error.message}`);
      throw new ServiceUnavailableException('Could not load reviews right now.');
    }
    return data ?? [];
  }
}
