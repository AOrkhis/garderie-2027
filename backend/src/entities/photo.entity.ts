import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Enfant } from './enfant.entity';
import { Garderie } from './garderie.entity';
import { Utilisateur } from './utilisateur.entity';

@Entity('photos')
export class Photo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  garderieId: number;

  @ManyToOne(() => Garderie, { onDelete: 'CASCADE' })
  garderie: Garderie;

  @Column({ type: 'int', nullable: true })
  auteurId: number | null;

  @ManyToOne(() => Utilisateur, { onDelete: 'SET NULL', nullable: true })
  auteur: Utilisateur | null;

  @Column({ length: 255 })
  cleStockage: string;

  @Column({ length: 255 })
  cleVignette: string;

  /** Image redimensionnée (JPEG ≤1920px) — stockée en BD (le disque Railway est éphémère). */
  @Column({ type: 'longblob', nullable: true, select: false })
  contenu: Buffer | null;

  /** Vignette JPEG ≤480px. */
  @Column({ type: 'longblob', nullable: true, select: false })
  vignette: Buffer | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  legende: string | null;

  @Column({ type: 'date' })
  date: string;

  @ManyToMany(() => Enfant)
  @JoinTable({
    name: 'photos_enfants',
    joinColumn: { name: 'photoId' },
    inverseJoinColumn: { name: 'enfantId' },
  })
  enfants: Enfant[];

  @CreateDateColumn()
  priseLe: Date;
}
