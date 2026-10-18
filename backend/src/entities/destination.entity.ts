import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { numericTransformer } from './numeric.transformer';

@Entity('destinations')
export class Destination {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column({ type: 'numeric', nullable: true, transformer: numericTransformer })
  latitude: number;

  @Column({ type: 'numeric', nullable: true, transformer: numericTransformer })
  longitude: number;

  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  location: string;

  @Column({ nullable: true })
  photo_url: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  category: string;

  @Column({ name: 'location_type' })
  location_type: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
