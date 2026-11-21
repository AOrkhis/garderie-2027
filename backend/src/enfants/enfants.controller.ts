import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  Roles,
  Utilisateur,
  UtilisateurConnecte,
} from '../common/auth.decorators';
import { Role } from '../common/enums';
import {
  AjouterParentDto,
  EnfantDto,
  FiltreEnfantsDto,
  ModifierEnfantDto,
} from './enfants.dto';
import { EnfantsService } from './enfants.service';

const PERSONNEL = [Role.ADMIN, Role.GESTIONNAIRE];

@Controller()
export class EnfantsController {
  constructor(private readonly service: EnfantsService) {}

  @Roles(...PERSONNEL)
  @Get('enfants')
  lister(
    @Utilisateur() user: UtilisateurConnecte,
    @Query() filtre: FiltreEnfantsDto,
  ) {
    return this.service.lister(user, filtre);
  }

  @Roles(...PERSONNEL)
  @Post('enfants')
  creer(@Utilisateur() user: UtilisateurConnecte, @Body() dto: EnfantDto) {
    return this.service.creer(user, dto);
  }

  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.PARENT)
  @Get('enfants/:id')
  obtenir(
    @Utilisateur() user: UtilisateurConnecte,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.obtenir(user, id);
  }

  @Roles(...PERSONNEL)
  @Patch('enfants/:id')
  modifier(
    @Utilisateur() user: UtilisateurConnecte,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModifierEnfantDto,
  ) {
    return this.service.modifier(user, id, dto);
  }

  @Roles(...PERSONNEL)
  @Get('enfants/:id/parents')
  listerParents(
    @Utilisateur() user: UtilisateurConnecte,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.listerParents(user, id);
  }

  @Roles(...PERSONNEL)
  @Post('enfants/:id/parents')
  ajouterParent(
    @Utilisateur() user: UtilisateurConnecte,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AjouterParentDto,
  ) {
    return this.service.ajouterParent(user, id, dto);
  }

  @Roles(...PERSONNEL)
  @HttpCode(204)
  @Delete('enfants/:id/parents/:parentId')
  retirerParent(
    @Utilisateur() user: UtilisateurConnecte,
    @Param('id', ParseIntPipe) id: number,
    @Param('parentId', ParseIntPipe) parentId: number,
  ) {
    return this.service.retirerParent(user, id, parentId);
  }

  @Roles(...PERSONNEL)
  @HttpCode(204)
  @Delete('enfants/:id/invitations/:invitationId')
  annulerInvitation(
    @Utilisateur() user: UtilisateurConnecte,
    @Param('id', ParseIntPipe) id: number,
    @Param('invitationId', ParseIntPipe) invitationId: number,
  ) {
    return this.service.annulerInvitationParent(user, id, invitationId);
  }

  @Roles(...PERSONNEL)
  @HttpCode(200)
  @Post('enfants/:id/invitations/:invitationId/renvoyer')
  renvoyerInvitation(
    @Utilisateur() user: UtilisateurConnecte,
    @Param('id', ParseIntPipe) id: number,
    @Param('invitationId', ParseIntPipe) invitationId: number,
  ) {
    return this.service.renvoyerInvitationParent(user, id, invitationId);
  }

  @Roles(Role.PARENT)
  @Get('parent/enfants')
  mesEnfants(@Utilisateur() user: UtilisateurConnecte) {
    return this.service.mesEnfants(user);
  }
}
