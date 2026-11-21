import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnfantsModule } from '../enfants/enfants.module';
import { Enfant, EntreeJournal, Garderie } from '../entities';
import { PhotosModule } from '../photos/photos.module';
import { JournalController } from './journal.controller';
import { JournalService } from './journal.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EntreeJournal, Enfant, Garderie]),
    EnfantsModule,
    PhotosModule,
  ],
  controllers: [JournalController],
  providers: [JournalService],
})
export class JournalModule {}
