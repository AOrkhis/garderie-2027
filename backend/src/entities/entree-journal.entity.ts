import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TypeEntree } from '../common/enums';
import { Enfant } from './enfant.entity';
import { Garderie } from './garderie.entity';
import { Photo } from './photo.entity';
import { Utilisateur } from './utilisateur.entity';

@Entity('entrees_journal')
@Index(['enfantId', 'date'])
export class EntreeJournal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  garderieId: number;

  @ManyToOne(() => Garderie, { onDelete: 'CASCADE' })
  garderie: Garderie;

  @Column()
  enfantId: number;

  @ManyToOne(() => Enfant, { onDelete: 'CASCADE' })
  enfant: Enfant;

  @Column({ type: 'int', nullable: true })
  auteurId: number | null;

  @ManyToOne(() => Utilisateur, { onDelete: 'SET NULL', nullable: true })
  auteur: Utilisateur | null;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 5 })
  heure: string;

  @Column({ type: 'enum', enum: TypeEntree })
  type: TypeEntree;

  @Column({ type: 'json' })
  donnees: Record<string, unknown>;

  @ManyToMany(() => Photo)
  @JoinTable({
    name: 'entrees_journal_photos',
    joinColumn: { name: 'entreeId' },
    inverseJoinColumn: { name: 'photoId' },
  })
  photos: Photo[];

  @CreateDateColumn()
  creeLe: Date;

  @UpdateDateColumn()
  modifieLe: Date;
}
