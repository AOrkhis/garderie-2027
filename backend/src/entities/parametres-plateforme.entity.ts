import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Réglages globaux de la plateforme (une seule ligne, id = 1). */
@Entity('parametres_plateforme')
export class ParametresPlateforme {
  @PrimaryColumn({ type: 'int' })
  id: number;

  /** Forfait attribué à une nouvelle garderie à l'inscription. */
  @Column({ length: 40 })
  forfaitDefaut: string;

  /** Forfait dont profite la garderie pendant l'essai (null = pas d'essai). */
  @Column({ type: 'varchar', length: 40, nullable: true })
  forfaitEssai: string | null;

  /** 0 = pas d'essai. */
  @Column({ type: 'int', default: 30 })
  dureeEssaiJours: number;

  @Column({ type: 'varchar', length: 255, default: '' })
  mentionTaxes: string;

  @UpdateDateColumn()
  modifieLe: Date;
}
