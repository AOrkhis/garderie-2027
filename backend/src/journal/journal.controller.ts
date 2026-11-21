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
  CreerEntreeDto,
  DateDto,
  ModifierEntreeDto,
  TerminerSiesteDto,
  VueJourDto,
} from './journal.dto';
import { JournalService } from './journal.service';

const PERSONNEL = [Role.ADMIN, Role.GESTIONNAIRE];

@Controller()
export class JournalController {
  constructor(private readonly service: JournalService) {}

  @Roles(Role.ADMIN, Role.GESTIONNAIRE, Role.PARENT)
  @Get('enfants/:id/journal')
  journalEnfant(
    @Utilisateur() user: UtilisateurConnecte,
    @Param('id', ParseIntPipe) id: number,
    @Query() q: DateDto,
  ) {
    return this.service.journalEnfant(user, id, q.date?.slice(0, 10));
  }

  @Roles(...PERSONNEL)
  @Get('journal/jour')
  vueDuJour(@Utilisateur() user: UtilisateurConnecte, @Query() q: VueJourDto) {
    return this.service.vueDuJour(user, q.groupeId, q.date?.slice(0, 10));
  }

  @Roles(...PERSONNEL)
  @Post('journal')
  creer(@Utilisateur() user: UtilisateurConnecte, @Body() dto: CreerEntreeDto) {
    return this.service.creer(user, dto);
  }

  @Roles(...PERSONNEL)
  @HttpCode(200)
  @Post('journal/:id/terminer-sieste')
  terminerSieste(
    @Utilisateur() user: UtilisateurConnecte,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: TerminerSiesteDto,
  ) {
    return this.service.terminerSieste(user, id, dto.fin);
  }

  @Roles(...PERSONNEL)
  @Patch('journal/:id')
  modifier(
    @Utilisateur() user: UtilisateurConnecte,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModifierEntreeDto,
  ) {
    return this.service.modifier(user, id, dto);
  }

  @Roles(...PERSONNEL)
  @HttpCode(204)
  @Delete('journal/:id')
  supprimer(
    @Utilisateur() user: UtilisateurConnecte,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.supprimer(user, id);
  }
}
