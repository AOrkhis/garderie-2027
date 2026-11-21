import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Adhesion } from './adhesion.entity';

@Entity('utilisateurs')
export class Utilisateur {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 190, unique: true })
  courriel: string;

  @Column({ length: 255, select: false })
  motDePasseHash: string;

  @Column({ length: 80 })
  prenom: string;

  @Column({ length: 80 })
  nom: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  telephone: string | null;

  @Column({ default: false })
  estSuperAdmin: boolean;

  @Column({ default: true })
  actif: boolean;

  @Column({ default: 0 })
  versionJeton: number;

  @Column({ type: 'varchar', length: 64, nullable: true, select: false })
  jetonReinitialisationHash: string | null;

  @Column({ type: 'datetime', nullable: true, select: false })
  jetonReinitialisationExpireLe: Date | null;

  @OneToMany(() => Adhesion, (a) => a.utilisateur)
  adhesions: Adhesion[];

  @CreateDateColumn()
  creeLe: Date;

  @UpdateDateColumn()
  modifieLe: Date;
}
