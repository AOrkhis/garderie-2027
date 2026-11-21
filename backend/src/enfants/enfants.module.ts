import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Adhesion,
  ContactUrgence,
  Enfant,
  EntreeJournal,
  Garderie,
  Groupe,
  Invitation,
  ParentEnfant,
  Utilisateur,
} from '../entities';
import { EnfantsController } from './enfants.controller';
import { EnfantsService } from './enfants.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Enfant,
      ContactUrgence,
      Groupe,
      ParentEnfant,
      Invitation,
      Utilisateur,
      Adhesion,
      Garderie,
      EntreeJournal,
    ]),
  ],
  controllers: [EnfantsController],
  providers: [EnfantsService],
  exports: [EnfantsService],
})
export class EnfantsModule {}
