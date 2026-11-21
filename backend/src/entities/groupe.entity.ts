import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Garderie } from './garderie.entity';
import { Utilisateur } from './utilisateur.entity';

@Entity('groupes')
export class Groupe {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  garderieId: number;

  @ManyToOne(() => Garderie, { onDelete: 'CASCADE' })
  garderie: Garderie;

  @Column({ length: 100 })
  nom: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  trancheAge: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  couleur: string | null;

  /** Âge minimum en mois (inclus) pour l'affectation automatique. */
  @Column({ type: 'int', nullable: true })
  ageMinMois: number | null;

  /** Âge maximum en mois (exclu) pour l'affectation automatique. */
  @Column({ type: 'int', nullable: true })
  ageMaxMois: number | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToMany(() => Utilisateur)
  @JoinTable({
    name: 'groupes_gestionnaires',
    joinColumn: { name: 'groupeId' },
    inverseJoinColumn: { name: 'utilisateurId' },
  })
  gestionnaires: Utilisateur[];

  @CreateDateColumn()
  creeLe: Date;
}
