import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from '../common/enums';
import { Garderie } from './garderie.entity';
import { Utilisateur } from './utilisateur.entity';

@Entity('adhesions')
@Index(['utilisateurId', 'garderieId', 'role'], { unique: true })
export class Adhesion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  utilisateurId: number;

  @ManyToOne(() => Utilisateur, (u) => u.adhesions, { onDelete: 'CASCADE' })
  utilisateur: Utilisateur;

  @Column()
  garderieId: number;

  @ManyToOne(() => Garderie, { onDelete: 'CASCADE' })
  garderie: Garderie;

  @Column({ type: 'enum', enum: Role })
  role: Role;

  @Column({ default: true })
  actif: boolean;

  @CreateDateColumn()
  creeLe: Date;
}
