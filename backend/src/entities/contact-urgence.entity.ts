import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Enfant } from './enfant.entity';

@Entity('contacts_urgence')
export class ContactUrgence {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  enfantId: number;

  @ManyToOne(() => Enfant, (e) => e.contactsUrgence, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  enfant: Enfant;

  @Column({ length: 160 })
  nom: string;

  @Column({ length: 30 })
  telephone: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  lien: string | null;

  @Column({ default: false })
  autoriseARecuperer: boolean;
}
