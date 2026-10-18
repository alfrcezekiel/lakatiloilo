import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
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

  async findOne(id: string): Promise<Destination> {
    const destination = await this.destinationsRepository.findOneBy({ id });
    if (!destination) {
      throw new NotFoundException(`Destination ${id} not found`);
    }
    return destination;
  }
}
