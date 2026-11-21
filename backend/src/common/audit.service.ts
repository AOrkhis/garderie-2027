import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JournalAudit } from '../entities';
import { UtilisateurConnecte } from './auth.decorators';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(JournalAudit)
    private readonly repo: Repository<JournalAudit>,
  ) {}

  async consigner(
    user: Pick<UtilisateurConnecte, 'utilisateurId' | 'garderieId'> | null,
    action: string,
    cible?: string,
    details?: Record<string, unknown>,
  ) {
    await this.repo.save(
      this.repo.create({
        garderieId: user?.garderieId ?? null,
        utilisateurId: user?.utilisateurId ?? null,
        action,
        cible: cible ?? null,
        details: details ?? null,
      }),
    );
  }
}
