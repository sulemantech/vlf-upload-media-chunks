import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { File } from './file.entity';

@Entity()
export class Chunk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  chunknumber: number;

  @ManyToOne(() => File, file => file.chunks)
  file: File;
}
