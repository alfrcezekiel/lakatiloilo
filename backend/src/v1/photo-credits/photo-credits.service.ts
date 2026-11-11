import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

// One credit on the Photo credits page (photo credits round, ticket 136):
// the place, and what the site shows under its photo. Never the
// authorization status, which is for the team.
export interface PhotoCreditEntry {
  place_type: 'destination' | 'accommodation';
  place_id: string;
  place_name: string;
  credit_line: string;
  licence: string;
  source_url: string;
}

@Injectable()
export class PhotoCreditsService {
  private readonly logger = new Logger(PhotoCreditsService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // Every credit saved on the dashboard, by place name A to Z. Read
  // through the backend's own database login (lakat_api may read the
  // table, 054). A deleted place's credits are already gone (054).
  // "Not checked yet" ones are left out: their photo is not shown
  // either (ticket 138).
  async list(): Promise<PhotoCreditEntry[]> {
    try {
      return await this.dataSource.query(
        `select pc.place_type, pc.place_id, coalesce(d.name, a.name) as place_name,
                pc.credit_line, pc.licence, pc.source_url
           from public.place_photo_credits pc
           left join public.destinations d on pc.place_type = 'destination' and d.id = pc.place_id
           left join public.accommodations a on pc.place_type = 'accommodation' and a.id = pc.place_id
          where coalesce(d.name, a.name) is not null
            and pc.authorization_status <> 'not_checked'
          order by place_name`,
      );
    } catch (error) {
      this.logger.error(`Could not read photo credits: ${String(error)}`);
      throw new ServiceUnavailableException('Could not load the photo credits right now.');
    }
  }
}
