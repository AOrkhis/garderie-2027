import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AuditService } from '../common/audit.service';
import {
  SuperAdmin,
  Utilisateur,
  UtilisateurConnecte,
} from '../common/auth.decorators';
import { CLES_FONCTIONNALITES } from '../common/fonctionnalites';
import { ForfaitsService } from '../common/forfaits.service';

class ForfaitDto {
  @Matches(/^[A-Z0-9_]{2,40}$/, {
    message:
      'Le code doit contenir de 2 à 40 lettres majuscules, chiffres ou « _ ».',
  })
  code: string;

  @IsString() @MaxLength(80) nom: string;
  @IsOptional() @IsString() @MaxLength(255) description?: string;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(100000) prixMensuel: number;
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000)
  prixAnnuel?: number | null;
  @IsOptional() @IsBoolean() prixAPartirDe?: boolean;

  /** null = illimité */
  @IsOptional() @IsInt() @Min(0) @Max(100000) maxEnfants?: number | null;
  @IsOptional() @IsInt() @Min(0) @Max(100000) maxPersonnel?: number | null;

  @IsOptional()
  @IsArray()
  @IsIn(CLES_FONCTIONNALITES, { each: true })
  fonctionnalites?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  points?: string[];

  @IsOptional() @IsInt() @Min(0) @Max(1000) ordre?: number;
  @IsOptional() @IsBoolean() public?: boolean;
  @IsOptional() @IsBoolean() vedette?: boolean;
  @IsOptional() @IsString() @MaxLength(40) etiquetteVedette?: string | null;
  @IsOptional() @IsString() @MaxLength(40) libelleBouton?: string | null;

  /** Prix Stripe pour la vente en ligne (null/vide = non vendu en ligne). */
  @IsOptional() @IsString() @MaxLength(100) stripePrixMensuelId?: string | null;
  @IsOptional() @IsString() @MaxLength(100) stripePrixAnnuelId?: string | null;
}

/** Mêmes règles, tous les champs facultatifs (le code n'est jamais modifié). */
class ModifierForfaitDto extends ForfaitDto {
  @IsOptional() declare code: string;
  @IsOptional() declare nom: string;
  @IsOptional() declare prixMensuel: number;
}

class ParametresDto {
  @IsOptional() @IsString() @MaxLength(40) forfaitDefaut?: string;
  /** null = pas d'essai */
  @IsOptional() @IsString() @MaxLength(40) forfaitEssai?: string | null;
  @IsOptional() @IsInt() @Min(0) @Max(365) dureeEssaiJours?: number;
  @IsOptional() @IsString() @MaxLength(255) mentionTaxes?: string;
}

@SuperAdmin()
@Controller('admin')
export class ForfaitsController {
  constructor(
    private readonly service: ForfaitsService,
    private readonly audit: AuditService,
  ) {}

  private consigner(user: UtilisateurConnecte, action: string, cible: string) {
    return this.audit.consigner(
      { utilisateurId: user.utilisateurId, garderieId: null },
      action,
      cible,
    );
  }

  @Get('forfaits')
  lister() {
    return this.service.administration();
  }

  @Post('forfaits')
  async creer(
    @Utilisateur() user: UtilisateurConnecte,
    @Body() dto: ForfaitDto,
  ) {
    const res = await this.service.creer(dto);
    await this.consigner(user, 'admin.forfait_cree', `forfait:${dto.code}`);
    return res;
  }

  @Patch('forfaits/:code')
  async modifier(
    @Utilisateur() user: UtilisateurConnecte,
    @Param('code') code: string,
    @Body() dto: ModifierForfaitDto,
  ) {
    const res = await this.service.modifier(code, dto);
    await this.consigner(user, 'admin.forfait_modifie', `forfait:${code}`);
    return res;
  }

  @Delete('forfaits/:code')
  async supprimer(
    @Utilisateur() user: UtilisateurConnecte,
    @Param('code') code: string,
  ) {
    const res = await this.service.supprimer(code);
    await this.consigner(user, 'admin.forfait_supprime', `forfait:${code}`);
    return res;
  }

  @Patch('parametres')
  async parametres(
    @Utilisateur() user: UtilisateurConnecte,
    @Body() dto: ParametresDto,
  ) {
    const res = await this.service.modifierParametres(dto);
    await this.consigner(user, 'admin.parametres_modifies', 'plateforme');
    return res;
  }
}
