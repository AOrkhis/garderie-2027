import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsEnum } from 'class-validator';
import { Repository } from 'typeorm';
import { AuditService } from '../common/audit.service';
import {
  SuperAdmin,
  Utilisateur,
  UtilisateurConnecte,
} from '../common/auth.decorators';
import { Role, StatutEnfant, StatutGarderie } from '../common/enums';
import { Adhesion, Enfant, EntreeJournal, Garderie, Photo } from '../entities';

class StatutGarderieDto {
  @IsEnum(StatutGarderie) statut: StatutGarderie;
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

  @Get('garderies')
  async lister() {
    const [garderies, enfants, personnel, parents, entrees, photos] =
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
      ]);
    return garderies.map((g) => ({
      ...g,
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
  async changerStatut(
    @Utilisateur() user: UtilisateurConnecte,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StatutGarderieDto,
  ) {
    const res = await this.garderies.update({ id }, { statut: dto.statut });
    if (!res.affected) throw new NotFoundException('Garderie introuvable.');
    await this.audit.consigner(
      { utilisateurId: user.utilisateurId, garderieId: id },
      `garderie.${dto.statut.toLowerCase()}`,
    );
    return this.garderies.findOneByOrFail({ id });
  }
}
