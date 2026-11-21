import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { IsIn, IsString, MaxLength } from 'class-validator';
import { Request } from 'express';
import {
  Public,
  Roles,
  Utilisateur,
  UtilisateurConnecte,
} from '../common/auth.decorators';
import { Role } from '../common/enums';
import { IntervalleFacturation, StripeService } from './stripe.service';

class SessionCheckoutDto {
  @IsString() @MaxLength(40) code: string;
  @IsIn(['mensuel', 'annuel']) intervalle: IntervalleFacturation;
}

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripe: StripeService) {}

  /** Le navigateur est redirigé vers Stripe Checkout (paiement hébergé). */
  @Roles(Role.ADMIN)
  @Post('checkout')
  checkout(
    @Utilisateur() user: UtilisateurConnecte,
    @Body() dto: SessionCheckoutDto,
  ) {
    return this.stripe.creerSessionCheckout(user, dto.code, dto.intervalle);
  }

  /** Portail client Stripe : factures, carte, annulation. */
  @Roles(Role.ADMIN)
  @Post('portail')
  portail(@Utilisateur() user: UtilisateurConnecte) {
    return this.stripe.creerSessionPortail(user);
  }

  /** Événements signés de Stripe — seule source de vérité pour l'état du paiement. */
  @Public()
  @Post('webhook')
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature || !req.rawBody)
      throw new BadRequestException('Signature Stripe manquante.');
    return this.stripe.traiterWebhook(req.rawBody, signature);
  }
}
