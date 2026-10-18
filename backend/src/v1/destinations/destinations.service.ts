import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { NearParams, applyNear, withDistance } from '../near-query';
import { Destination } from '../../entities/destination.entity';

// Talks to the destinations table. The controller calls these methods.
@Injectable()
export class DestinationsService {
  constructor(
    @InjectRepository(Destination)
    private readonly destinationsRepository: Repository<Destination>,
  ) {}

  // Both filters are optional. TypeORM sends them as query parameters,
  // never glued into the SQL text, so user input cannot change the query.
  findAll(category?: string, locationType?: string): Promise<Destination[]> {
    const where: FindOptionsWhere<Destination> = {};
    if (category) where.category = category;
    if (locationType) where.location_type = locationType;

    return this.destinationsRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  // Rows within near.radiusKm of the point, nearest first, each with
  // distance_km. The optional category filter narrows the results further.
  findNear(near: NearParams, category?: string) {
    const qb = applyNear(
      this.destinationsRepository.createQueryBuilder('destination'),
      'destination',
      near,
    );
    if (category) qb.andWhere('destination.category = :category', { category });
    return withDistance(qb);
  }

  async findOne(id: string): Promise<Destination> {
    const destination = await this.destinationsRepository.findOneBy({ id });
    if (!destination) {
      throw new NotFoundException(`Destination ${id} not found`);
    }
    return destination;
  }
}
