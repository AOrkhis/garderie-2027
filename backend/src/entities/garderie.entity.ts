import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PlanGarderie, StatutGarderie } from '../common/enums';

@Entity('garderies')
export class Garderie {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nom: string;

  @Column({ length: 160, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  adresse: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telephone: string | null;

  @Column({ type: 'varchar', length: 190, nullable: true })
  courriel: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  heuresOuverture: string | null;

  @Column({ length: 60, default: 'America/Toronto' })
  fuseauHoraire: string;

  @Column({
    type: 'enum',
    enum: StatutGarderie,
    default: StatutGarderie.ACTIVE,
  })
  statut: StatutGarderie;

  @Column({ type: 'enum', enum: PlanGarderie, default: PlanGarderie.GRATUIT })
  plan: PlanGarderie;

  /** Fin de la période d'essai Pro (null = pas d'essai en cours). */
  @Column({ type: 'datetime', nullable: true })
  essaiJusquau: Date | null;

  /** Fonctionnalités accordées au cas par cas par le super admin (en plus du plan). */
  @Column({ type: 'json' })
  fonctionnalitesExtra: string[];

  @CreateDateColumn()
  creeLe: Date;

  @UpdateDateColumn()
  modifieLe: Date;
}
