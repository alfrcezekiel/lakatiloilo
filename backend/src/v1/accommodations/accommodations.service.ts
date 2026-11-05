import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { NearParams, applyNear, withDistance } from '../near-query';
import { Accommodation } from '../../entities/accommodation.entity';

// Talks to the accommodations table. The controller calls these methods.
@Injectable()
export class AccommodationsService {
  constructor(
    @InjectRepository(Accommodation)
    private readonly accommodationsRepository: Repository<Accommodation>,
  ) {}

  // The filter is optional. TypeORM sends it as a query parameter,
  // never glued into the SQL text, so user input cannot change the query.
  findAll(type?: string): Promise<Accommodation[]> {
    const where: FindOptionsWhere<Accommodation> = {};
    if (type) where.type = type;

    return this.accommodationsRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  // Rows within near.radiusKm of the point, nearest first, each with
  // distance_km. The optional type filter narrows the results further.
  findNear(near: NearParams, type?: string) {
    const qb = applyNear(
      this.accommodationsRepository.createQueryBuilder('accommodation'),
      'accommodation',
      near,
    );
    if (type) qb.andWhere('accommodation.type = :type', { type });
    return withDistance(qb);
  }

  async findOne(id: string): Promise<Accommodation> {
    const accommodation = await this.accommodationsRepository.findOneBy({ id });
    if (!accommodation) {
      throw new NotFoundException("We couldn't find that accommodation.");
    }
    return accommodation;
  }
}
