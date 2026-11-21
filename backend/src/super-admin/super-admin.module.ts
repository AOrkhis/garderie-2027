import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Adhesion, Enfant, EntreeJournal, Garderie, Photo } from '../entities';
import { ForfaitsController } from './forfaits.controller';
import { SuperAdminController } from './super-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Garderie,
      Enfant,
      Adhesion,
      EntreeJournal,
      Photo,
    ]),
  ],
  controllers: [SuperAdminController, ForfaitsController],
})
export class SuperAdminModule {}
