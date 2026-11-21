import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('journal_audit')
@Index(['garderieId', 'creeLe'])
export class JournalAudit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  garderieId: number | null;

  @Column({ type: 'int', nullable: true })
  utilisateurId: number | null;

  @Column({ length: 80 })
  action: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  cible: string | null;

  @Column({ type: 'json', nullable: true })
  details: Record<string, unknown> | null;

  @CreateDateColumn()
  creeLe: Date;
}
