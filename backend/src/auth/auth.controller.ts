import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  Public,
  Utilisateur,
  UtilisateurConnecte,
} from '../common/auth.decorators';
import {
  AccepterInvitationDto,
  ChangerAdhesionDto,
  ChangerMotDePasseDto,
  ConnexionDto,
  InscriptionGarderieDto,
  ModifierProfilDto,
  MotDePasseOublieDto,
  RafraichirDto,
  ReinitialiserDto,
} from './auth.dto';
import { AuthService } from './auth.service';
import { InvitationsService } from './invitations.service';

@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly invitations: InvitationsService,
  ) {}

  @Public()
  @Post('auth/inscription-garderie')
  inscrire(@Body() dto: InscriptionGarderieDto) {
    return this.auth.inscrireGarderie(dto);
  }

  @Public()
  @HttpCode(200)
  @Post('auth/connexion')
  connexion(@Body() dto: ConnexionDto) {
    return this.auth.connexion(dto);
  }

  @Public()
  @HttpCode(200)
  @Post('auth/rafraichir')
  rafraichir(@Body() dto: RafraichirDto) {
    return this.auth.rafraichir(dto.refreshToken);
  }

  @HttpCode(200)
  @Post('auth/changer-adhesion')
  changerAdhesion(
    @Utilisateur() user: UtilisateurConnecte,
    @Body() dto: ChangerAdhesionDto,
  ) {
    return this.auth.changerAdhesion(user, dto.adhesionId);
  }

  @Get('auth/moi')
  moi(@Utilisateur() user: UtilisateurConnecte) {
    return this.auth.moi(user);
  }

  @Patch('auth/moi')
  modifierProfil(
    @Utilisateur() user: UtilisateurConnecte,
    @Body() dto: ModifierProfilDto,
  ) {
    return this.auth.modifierProfil(user, dto);
  }

  @HttpCode(200)
  @Post('auth/moi/mot-de-passe')
  changerMotDePasse(
    @Utilisateur() user: UtilisateurConnecte,
    @Body() dto: ChangerMotDePasseDto,
  ) {
    return this.auth.changerMotDePasse(user, dto);
  }

  @Public()
  @HttpCode(200)
  @Post('auth/mot-de-passe-oublie')
  async motDePasseOublie(@Body() dto: MotDePasseOublieDto) {
    await this.auth.motDePasseOublie(dto.courriel);
    return {
      message:
        'Si un compte existe avec ce courriel, un lien de réinitialisation a été envoyé.',
    };
  }

  @Public()
  @HttpCode(200)
  @Post('auth/reinitialiser-mot-de-passe')
  async reinitialiser(@Body() dto: ReinitialiserDto) {
    await this.auth.reinitialiser(dto);
    return {
      message:
        'Votre mot de passe a été modifié. Vous pouvez maintenant vous connecter.',
    };
  }

  @Public()
  @Get('invitations/:jeton')
  infoInvitation(@Param('jeton') jeton: string) {
    return this.invitations.info(jeton);
  }

  @Public()
  @HttpCode(200)
  @Post('invitations/:jeton/accepter')
  accepterInvitation(
    @Param('jeton') jeton: string,
    @Body() dto: AccepterInvitationDto,
  ) {
    return this.invitations.accepter(jeton, dto);
  }
}
