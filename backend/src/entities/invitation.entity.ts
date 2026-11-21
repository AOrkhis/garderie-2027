import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LienParent, Role } from '../common/enums';
import { Enfant } from './enfant.entity';
import { Garderie } from './garderie.entity';

@Entity('invitations')
export class Invitation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  garderieId: number;

  @ManyToOne(() => Garderie, { onDelete: 'CASCADE' })
  garderie: Garderie;

  @Column({ length: 190 })
  courriel: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  prenom: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  nom: string | null;

  @Column({ type: 'enum', enum: Role })
  role: Role;

  @Column({ length: 64, unique: true, select: false })
  jetonHash: string;

  @Column({ type: 'int', nullable: true })
  enfantId: number | null;

  @ManyToOne(() => Enfant, { onDelete: 'CASCADE', nullable: true })
  enfant: Enfant | null;

  @Column({ type: 'enum', enum: LienParent, nullable: true })
  lien: LienParent | null;

  @Column({ type: 'simple-json', nullable: true })
  groupeIds: number[] | null;

  @Column({ type: 'int', nullable: true })
  inviteParId: number | null;

  @Column({ type: 'datetime' })
  expireLe: Date;

  @Column({ type: 'datetime', nullable: true })
  accepteeLe: Date | null;

  @CreateDateColumn()
  creeLe: Date;
}
