import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  Roles,
  Utilisateur,
  UtilisateurConnecte,
} from '../common/auth.decorators';
import { Role } from '../common/enums';
import {
  GroupeDto,
  InviterPersonnelDto,
  ModifierGarderieDto,
  ModifierGroupeDto,
  ModifierMembreDto,
  ReaffecterDto,
} from './garderie.dto';
import { GarderieService } from './garderie.service';

@Controller()
export class GarderieController {
  constructor(private readonly service: GarderieService) {}

  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.PARENT)
  @Get('garderie')
  obtenir(@Utilisateur() user: UtilisateurConnecte) {
    return this.service.obtenir(user);
  }

  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  @Get('garderie/demarrage')
  demarrage(@Utilisateur() user: UtilisateurConnecte) {
    return this.service.demarrage(user);
  }

  @Roles(Role.ADMIN)
  @HttpCode(200)
  @Post('personnel/invitations/:id/renvoyer')
  renvoyerInvitation(
    @Utilisateur() user: UtilisateurConnecte,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.renvoyerInvitation(user, id);
  }

  @Roles(Role.ADMIN)
  @Get('groupes/reaffectation')
  apercuReaffectation(@Utilisateur() user: UtilisateurConnecte) {
    return this.service.apercuReaffectation(user);
  }

  @Roles(Role.ADMIN)
  @HttpCode(200)
  @Post('groupes/reaffectation')
  reaffecter(
    @Utilisateur() user: UtilisateurConnecte,
    @Body() dto: ReaffecterDto,
  ) {
    return this.service.reaffecter(user, dto.enfantIds);
  }

  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.PARENT)
  @Get('garderie/logo')
  async logo(@Utilisateur() user: UtilisateurConnecte, @Res() res: Response) {
    const { contenu, mime } = await this.service.obtenirLogo(user);
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(contenu);
  }

  @Roles(Role.ADMIN)
  @HttpCode(200)
  @Post('garderie/logo')
  @UseInterceptors(
    FileInterceptor('logo', {
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, f, cb) =>
        ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(
          f.mimetype,
        )
          ? cb(null, true)
          : cb(
              new BadRequestException(
                'Le logo doit être une image PNG, JPEG, WebP ou GIF (2 Mo max).',
              ),
              false,
            ),
    }),
  )
  definirLogo(
    @Utilisateur() user: UtilisateurConnecte,
    @UploadedFile() fichier?: Express.Multer.File,
  ) {
    if (!fichier) throw new BadRequestException('Aucun fichier reçu.');
    return this.service.definirLogo(user, fichier);
  }

  @Roles(Role.ADMIN)
  @HttpCode(204)
  @Delete('garderie/logo')
  supprimerLogo(@Utilisateur() user: UtilisateurConnecte) {
    return this.service.supprimerLogo(user);
  }

  @Roles(Role.ADMIN)
  @Patch('garderie')
  modifier(
    @Utilisateur() user: UtilisateurConnecte,
    @Body() dto: ModifierGarderieDto,
  ) {
    return this.service.modifier(user, dto);
  }

  @Roles(Role.ADMIN, Role.GESTIONNAIRE)
  @Get('groupes')
  listerGroupes(@Utilisateur() user: UtilisateurConnecte) {
    return this.service.listerGroupes(user);
  }

  @Roles(Role.ADMIN)
  @Post('groupes')
  creerGroupe(
    @Utilisateur() user: UtilisateurConnecte,
    @Body() dto: GroupeDto,
  ) {
    return this.service.creerGroupe(user, dto);
  }

  @Roles(Role.ADMIN)
  @Patch('groupes/:id')
  modifierGroupe(
    @Utilisateur() user: UtilisateurConnecte,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModifierGroupeDto,
  ) {
    return this.service.modifierGroupe(user, id, dto);
  }

  @Roles(Role.ADMIN)
  @HttpCode(204)
  @Delete('groupes/:id')
  supprimerGroupe(
    @Utilisateur() user: UtilisateurConnecte,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.supprimerGroupe(user, id);
  }

  @Roles(Role.ADMIN)
  @Get('personnel')
  listerPersonnel(@Utilisateur() user: UtilisateurConnecte) {
    return this.service.listerPersonnel(user);
  }

  @Roles(Role.ADMIN)
  @Post('personnel/invitations')
  inviter(
    @Utilisateur() user: UtilisateurConnecte,
    @Body() dto: InviterPersonnelDto,
  ) {
    return this.service.inviterPersonnel(user, dto);
  }

  @Roles(Role.ADMIN)
  @HttpCode(204)
  @Delete('personnel/invitations/:id')
  annulerInvitation(
    @Utilisateur() user: UtilisateurConnecte,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.annulerInvitation(user, id);
  }

  @Roles(Role.ADMIN)
  @Patch('personnel/:adhesionId')
  modifierMembre(
    @Utilisateur() user: UtilisateurConnecte,
    @Param('adhesionId', ParseIntPipe) adhesionId: number,
    @Body() dto: ModifierMembreDto,
  ) {
    return this.service.modifierMembre(user, adhesionId, dto);
  }
}
