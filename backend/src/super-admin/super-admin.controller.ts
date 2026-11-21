import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  Max,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';
import { Repository } from 'typeorm';
import { AuditService } from '../common/audit.service';
import {
  SuperAdmin,
  Utilisateur,
  UtilisateurConnecte,
} from '../common/auth.decorators';
import {
  FONCTIONNALITES,
  Fonctionnalite,
  fonctionnalitesDe,
  fonctionnalitesDuPlan,
  limitesDe,
  planEffectif,
} from '../common/fonctionnalites';
import {
  PlanGarderie,
  Role,
  StatutEnfant,
  StatutGarderie,
} from '../common/enums';
import { Adhesion, Enfant, EntreeJournal, Garderie, Photo } from '../entities';

const CLES_FONCTIONNALITES = FONCTIONNALITES.map((f) => f.cle);

class ModifierGarderieAdminDto {
  @IsOptional() @IsEnum(StatutGarderie) statut?: StatutGarderie;
  @IsOptional() @IsEnum(PlanGarderie) plan?: PlanGarderie;
  @IsOptional() @IsDateString() essaiJusquau?: string | null;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(CLES_FONCTIONNALITES, { each: true })
  fonctionnalitesExtra?: string[];
  /** null = revenir à la limite du forfait. */
  @IsOptional() @IsInt() @Min(0) @Max(100000) maxEnfantsPerso?: number | null;
  @IsOptional() @IsInt() @Min(0) @Max(100000) maxPersonnelPerso?: number | null;
}

async function compter(
  repo: Repository<object>,
  alias: string,
  where = '1=1',
  params = {},
) {
  const rows: { garderieId: number; total: string }[] = await repo
    .createQueryBuilder(alias)
    .select(`${alias}.garderieId`, 'garderieId')
    .addSelect('COUNT(*)', 'total')
    .where(where, params)
    .groupBy(`${alias}.garderieId`)
    .getRawMany();
  return new Map(rows.map((r) => [Number(r.garderieId), Number(r.total)]));
}

@SuperAdmin()
@Controller('admin')
export class SuperAdminController {
  constructor(
    private readonly audit: AuditService,
    @InjectRepository(Garderie)
    private readonly garderies: Repository<Garderie>,
    @InjectRepository(Enfant) private readonly enfants: Repository<Enfant>,
    @InjectRepository(Adhesion)
    private readonly adhesions: Repository<Adhesion>,
    @InjectRepository(EntreeJournal)
    private readonly entrees: Repository<EntreeJournal>,
    @InjectRepository(Photo) private readonly photos: Repository<Photo>,
  ) {}

  /** Registre des fonctionnalités cochables dans la console. */
  @Get('fonctionnalites')
  fonctionnalites() {
    return FONCTIONNALITES;
  }

  @Get('garderies')
  async lister() {
    const [garderies, enfants, personnel, parents, entrees, photos, staff] =
      await Promise.all([
        this.garderies.find({ order: { creeLe: 'DESC' } }),
        compter(this.enfants, 'e', 'e.statut = :s', { s: StatutEnfant.ACTIF }),
        compter(this.adhesions, 'a', 'a.role IN (:...r) AND a.actif = 1', {
          r: [Role.ADMIN, Role.GESTIONNAIRE],
        }),
        compter(this.adhesions, 'a', 'a.role = :r AND a.actif = 1', {
          r: Role.PARENT,
        }),
        compter(this.entrees, 'j'),
        compter(this.photos, 'p'),
        this.adhesions.find({
          where: { role: Role.ADMIN, actif: true },
          relations: { utilisateur: true },
        }),
      ]);
    const admins = new Map<number, { nom: string; courriel: string }[]>();
    for (const a of staff) {
      const liste = admins.get(a.garderieId) ?? [];
      liste.push({
        nom: `${a.utilisateur.prenom} ${a.utilisateur.nom}`,
        courriel: a.utilisateur.courriel,
      });
      admins.set(a.garderieId, liste);
    }
    return garderies.map((g) => ({
      ...g,
      planEffectif: planEffectif(g),
      fonctionnalitesPlan: fonctionnalitesDuPlan(g),
      fonctionnalitesEffectives: fonctionnalitesDe(g),
      limites: limitesDe(g),
      admins: admins.get(g.id) ?? [],
      statistiques: {
        enfants: enfants.get(g.id) ?? 0,
        personnel: personnel.get(g.id) ?? 0,
        parents: parents.get(g.id) ?? 0,
        entrees: entrees.get(g.id) ?? 0,
        photos: photos.get(g.id) ?? 0,
      },
    }));
  }

  @Patch('garderies/:id')
  async modifier(
    @Utilisateur() user: UtilisateurConnecte,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModifierGarderieAdminDto,
  ) {
    const champs: Partial<Garderie> = {};
    if (dto.statut) champs.statut = dto.statut;
    if (dto.plan) champs.plan = dto.plan;
    if (dto.essaiJusquau !== undefined)
      champs.essaiJusquau = dto.essaiJusquau
        ? new Date(dto.essaiJusquau)
        : null;
    if (dto.fonctionnalitesExtra !== undefined)
      champs.fonctionnalitesExtra = dto.fonctionnalitesExtra.filter((f) =>
        CLES_FONCTIONNALITES.includes(f as Fonctionnalite),
      );
    if (dto.maxEnfantsPerso !== undefined)
      champs.maxEnfantsPerso = dto.maxEnfantsPerso;
    if (dto.maxPersonnelPerso !== undefined)
      champs.maxPersonnelPerso = dto.maxPersonnelPerso;
    if (!Object.keys(champs).length)
      throw new BadRequestException('Aucune modification fournie.');
    const res = await this.garderies.update({ id }, champs);
    if (!res.affected) throw new NotFoundException('Garderie introuvable.');
    const details = Object.entries(champs)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(', ');
    await this.audit.consigner(
      { utilisateurId: user.utilisateurId, garderieId: id },
      'admin.garderie_modifiee',
      `garderie:${id}`,
      { champs: details },
    );
    const g = await this.garderies.findOneByOrFail({ id });
    return {
      ...g,
      planEffectif: planEffectif(g),
      fonctionnalitesPlan: fonctionnalitesDuPlan(g),
      fonctionnalitesEffectives: fonctionnalitesDe(g),
      limites: limitesDe(g),
    };
  }
}
