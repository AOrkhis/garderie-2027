import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvenementStripe, Forfait, Garderie } from '../entities';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';

@Module({
  imports: [TypeOrmModule.forFeature([Garderie, Forfait, EvenementStripe])],
  controllers: [StripeController],
  providers: [StripeService],
})
export class StripeModule {}
