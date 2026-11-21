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

  /** Logo stocké en base (le disque Railway est éphémère). */
  @Column({ type: 'longblob', nullable: true, select: false })
  logo: Buffer | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  logoMime: string | null;

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

  /** Ancienne colonne (enum) conservée telle quelle pour la migration vers `forfait`. */
  @Column({
    name: 'plan',
    type: 'enum',
    enum: PlanGarderie,
    default: PlanGarderie.GRATUIT,
    select: false,
  })
  planHerite: PlanGarderie;

  /** Code du forfait (table `forfaits`). */
  @Column({ name: 'forfait', type: 'varchar', length: 40, nullable: true })
  plan: string;

  /** Fin de la période d'essai Pro (null = pas d'essai en cours). */
  @Column({ type: 'datetime', nullable: true })
  essaiJusquau: Date | null;

  /** Fonctionnalités accordées au cas par cas par le super admin (en plus du plan). */
  @Column({ type: 'json', nullable: true })
  fonctionnalitesExtra: string[] | null;

  /** Limites fixées par le super admin (null = celles du forfait). */
  @Column({ type: 'int', nullable: true })
  maxEnfantsPerso: number | null;

  @Column({ type: 'int', nullable: true })
  maxPersonnelPerso: number | null;

  /** Identifiant du client Stripe (null = jamais payé en ligne). */
  @Column({ type: 'varchar', length: 100, nullable: true })
  stripeClientId: string | null;

  /** Identifiant de l'abonnement Stripe en cours. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  stripeAbonnementId: string | null;

  /** Statut de l'abonnement Stripe (active, past_due, canceled…). */
  @Column({ type: 'varchar', length: 40, nullable: true })
  stripeStatut: string | null;

  /** Fin de la période Stripe payée (renouvellement ou échéance). */
  @Column({ type: 'datetime', nullable: true })
  payeJusquau: Date | null;

  @CreateDateColumn()
  creeLe: Date;

  @UpdateDateColumn()
  modifieLe: Date;
}
