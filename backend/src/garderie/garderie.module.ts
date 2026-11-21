import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Adhesion, Enfant, Garderie, Groupe, Invitation } from '../entities';
import { GarderieController } from './garderie.controller';
import { GarderieService } from './garderie.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Garderie, Groupe, Adhesion, Invitation, Enfant]),
  ],
  controllers: [GarderieController],
  providers: [GarderieService],
})
export class GarderieModule {}
