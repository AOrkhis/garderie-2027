import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Forfait,
  Garderie,
  JournalAudit,
  ParametresPlateforme,
} from '../entities';
import { AuditService } from './audit.service';
import { ForfaitsService } from './forfaits.service';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      JournalAudit,
      Forfait,
      ParametresPlateforme,
      Garderie,
    ]),
  ],
  providers: [MailService, AuditService, ForfaitsService],
  exports: [MailService, AuditService, ForfaitsService],
})
export class CommonModule {}
