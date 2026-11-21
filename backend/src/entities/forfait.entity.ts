import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Les DECIMAL MySQL sont lus comme des chaînes : on les convertit en nombres. */
const enNombre = {
  to: (v: number | null) => v,
  from: (v: string | null) => (v === null ? null : Number(v)),
};

/** Forfait d'abonnement, entièrement géré par le super admin. */
@Entity('forfaits')
export class Forfait {
  @PrimaryGeneratedColumn()
  id: number;

  /** Identifiant stable référencé par les garderies (ex. « PRO »). Non modifiable. */
  @Column({ length: 40, unique: true })
  code: string;

  @Column({ length: 80 })
  nom: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  description: string;

  /** Prix en dollars canadiens, avant taxes. */
  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: enNombre })
  prixMensuel: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: enNombre,
  })
  prixAnnuel: number | null;

  /** Affiche « dès » devant le prix (forfait négocié). */
  @Column({ default: false })
  prixAPartirDe: boolean;

  /** null = illimité */
  @Column({ type: 'int', nullable: true })
  maxEnfants: number | null;

  @Column({ type: 'int', nullable: true })
  maxPersonnel: number | null;

  @Column({ type: 'json', nullable: true })
  fonctionnalites: string[] | null;

  /** Arguments affichés sur la grille tarifaire. */
  @Column({ type: 'json', nullable: true })
  points: string[] | null;

  @Column({ type: 'int', default: 0 })
  ordre: number;

  /** Visible sur la page d'accueil et dans la comparaison des forfaits. */
  @Column({ default: true })
  public: boolean;

  /** Mis en avant sur la grille tarifaire. */
  @Column({ default: false })
  vedette: boolean;

  @Column({ type: 'varchar', length: 40, nullable: true })
  etiquetteVedette: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  libelleBouton: string | null;

  /** ID du prix Stripe pour la facturation mensuelle (null = non vendu en ligne). */
  @Column({ type: 'varchar', length: 100, nullable: true })
  stripePrixMensuelId: string | null;

  /** ID du prix Stripe pour la facturation annuelle. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  stripePrixAnnuelId: string | null;

  @CreateDateColumn()
  creeLe: Date;

  @UpdateDateColumn()
  modifieLe: Date;
}
