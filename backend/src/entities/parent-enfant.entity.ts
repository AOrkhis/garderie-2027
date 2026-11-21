import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { LienParent } from '../common/enums';
import { Enfant } from './enfant.entity';
import { Utilisateur } from './utilisateur.entity';

@Entity('parents_enfants')
export class ParentEnfant {
  @PrimaryColumn()
  parentId: number;

  @PrimaryColumn()
  enfantId: number;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  parent: Utilisateur;

  @ManyToOne(() => Enfant, (e) => e.parents, { onDelete: 'CASCADE' })
  enfant: Enfant;

  @Column({ type: 'enum', enum: LienParent, default: LienParent.AUTRE })
  lien: LienParent;

  @CreateDateColumn()
  creeLe: Date;
}
