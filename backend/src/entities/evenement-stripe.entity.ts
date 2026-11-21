import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/** Événements Stripe déjà traités — garantit l'idempotence du webhook. */
@Entity('evenements_stripe')
export class EvenementStripe {
  /** ID de l'événement Stripe (evt_...). */
  @PrimaryColumn({ length: 80 })
  id: string;

  @Column({ length: 80 })
  type: string;

  @CreateDateColumn()
  traiteeLe: Date;
}
