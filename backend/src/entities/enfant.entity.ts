import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StatutEnfant } from '../common/enums';
import { ContactUrgence } from './contact-urgence.entity';
import { Garderie } from './garderie.entity';
import { Groupe } from './groupe.entity';
import { ParentEnfant } from './parent-enfant.entity';

@Entity('enfants')
export class Enfant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  garderieId: number;

  @ManyToOne(() => Garderie, { onDelete: 'CASCADE' })
  garderie: Garderie;

  @Column({ type: 'int', nullable: true })
  groupeId: number | null;

  @ManyToOne(() => Groupe, { onDelete: 'SET NULL', nullable: true })
  groupe: Groupe | null;

  @Column({ length: 80 })
  prenom: string;

  @Column({ length: 80 })
  nom: string;

  @Column({ type: 'date' })
  dateNaissance: string;

  @Column({ type: 'int', nullable: true })
  photoProfilId: number | null;

  @Column({ type: 'text', nullable: true })
  allergies: string | null;

  @Column({ type: 'text', nullable: true })
  restrictionsAlimentaires: string | null;

  @Column({ type: 'text', nullable: true })
  notesMedicales: string | null;

  @Column({ default: false })
  consentementPhoto: boolean;

  @Column({ type: 'enum', enum: StatutEnfant, default: StatutEnfant.ACTIF })
  statut: StatutEnfant;

  @Column({ type: 'date', nullable: true })
  dateEntree: string | null;

  @OneToMany(() => ContactUrgence, (c) => c.enfant, { cascade: true })
  contactsUrgence: ContactUrgence[];

  @OneToMany(() => ParentEnfant, (p) => p.enfant)
  parents: ParentEnfant[];

  @CreateDateColumn()
  creeLe: Date;

  @UpdateDateColumn()
  modifieLe: Date;
}
