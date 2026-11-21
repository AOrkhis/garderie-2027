import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JournalAudit } from '../entities';
import { AuditService } from './audit.service';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([JournalAudit])],
  providers: [MailService, AuditService],
  exports: [MailService, AuditService],
})
export class CommonModule {}
