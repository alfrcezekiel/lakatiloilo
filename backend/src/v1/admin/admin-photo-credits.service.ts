import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { httpErrorFrom } from '../database-errors';
import { TravelerTransactions } from '../traveler-transactions';
import { AdminPlacesService, type AdminPlaceDetails, type AdminPlaceType } from './admin-places.service';
import { bad, saveCredits, type PhotoCredits } from './photo-credits';

// Saving a place's photo credits from the dashboard (photo credits round,
// ticket 132). The fields, their checks and the queries are in
// photo-credits.ts.

// Adds or changes a place's credits, as the signed-in admin, so Row Level
// Security decides (only admins, 054). They are saved for the place's
// photo as it is now.
@Injectable()
export class AdminPhotoCreditsService {
  private readonly logger = new Logger(AdminPhotoCreditsService.name);

  constructor(
    private readonly travelerTransactions: TravelerTransactions,
    private readonly adminPlaces: AdminPlacesService,
  ) {}

  async save(
    accessToken: string,
    type: AdminPlaceType,
    id: string,
    credits: PhotoCredits,
  ): Promise<AdminPlaceDetails> {
    await this.travelerTransactions.run(
      accessToken,
      (runner) => saveCredits(runner, type, id, credits),
      (error) => this.toHttpError(error),
    );
    return this.adminPlaces.findOne(accessToken, type, id);
  }

  private toHttpError(error: unknown) {
    return httpErrorFrom(error, this.logger, 'save photo credits', {
      // A field the database refused (054): a length, the URL, or
      // "All rights reserved" without the owner's permission.
      '23514': () => bad('Please check the photo credits and try again.'),
      // The place does not exist (054's trigger).
      '23503': () => new NotFoundException("We couldn't find that place."),
    });
  }
}

