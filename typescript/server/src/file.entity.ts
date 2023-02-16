import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Chunk } from './chunk.entity';

@Entity()
export class File {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  size: number;

  @Column()
  totalChunks: number;

  @Column()
  uploadedChunks: number;

  @OneToMany(type => Chunk, chunk => chunk.file)
  chunks: Chunk[];
}
