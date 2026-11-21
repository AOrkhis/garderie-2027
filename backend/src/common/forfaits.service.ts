import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Forfait, Garderie, ParametresPlateforme } from '../entities';
import {
  definirCacheForfaits,
  forfait,
  forfaitsEnCache,
  FORFAITS_INITIAUX,
  PARAMETRES_INITIAUX,
  parametresEnCache,
} from './fonctionnalites';

@Injectable()
export class ForfaitsService implements OnModuleInit {
  private readonly logger = new Logger(ForfaitsService.name);

  constructor(
    @InjectRepository(Forfait) private readonly forfaits: Repository<Forfait>,
    @InjectRepository(ParametresPlateforme)
    private readonly parametres: Repository<ParametresPlateforme>,
    @InjectRepository(Garderie)
    private readonly garderies: Repository<Garderie>,
  ) {}

  async onModuleInit() {
    if (!(await this.forfaits.count())) {
      await this.forfaits.save(
        FORFAITS_INITIAUX.map((f) => this.forfaits.create(f)),
      );
      this.logger.log('Forfaits initiaux créés.');
    }
    if (!(await this.parametres.existsBy({ id: 1 })))
      await this.parametres.save(this.parametres.create(PARAMETRES_INITIAUX));
    // Migration : l'ancienne colonne enum `plan` → `forfait`.
    await this.garderies.query(
      'UPDATE garderies SET forfait = plan WHERE forfait IS NULL',
    );
    await this.recharger();
  }

  async recharger() {
    definirCacheForfaits(
      await this.forfaits.find({ order: { ordre: 'ASC', id: 'ASC' } }),
      await this.parametres.findOneBy({ id: 1 }),
    );
  }

  /** Grille publique : forfaits visibles + réglages utiles à l'affichage. */
  public() {
    const p = parametresEnCache();
    const essai = forfait(p?.forfaitEssai);
    return {
      forfaits: forfaitsEnCache().filter((f) => f.public),
      parametres: {
        dureeEssaiJours: essai ? (p?.dureeEssaiJours ?? 0) : 0,
        forfaitEssai: essai ? { code: essai.code, nom: essai.nom } : null,
        mentionTaxes: p?.mentionTaxes ?? '',
      },
    };
  }

  async administration() {
    const usages: { code: string; total: string }[] = await this.garderies
      .createQueryBuilder('g')
      .select('g.plan', 'code')
      .addSelect('COUNT(*)', 'total')
      .groupBy('g.plan')
      .getRawMany();
    const compte = new Map(usages.map((u) => [u.code, Number(u.total)]));
    return {
      forfaits: forfaitsEnCache().map((f) => ({
        ...f,
        garderies: compte.get(f.code) ?? 0,
      })),
      parametres: parametresEnCache(),
    };
  }

  async creer(champs: Partial<Forfait>) {
    if (await this.forfaits.existsBy({ code: champs.code }))
      throw new ConflictException('Un forfait utilise déjà ce code.');
    const ordre = champs.ordre ?? (forfaitsEnCache().at(-1)?.ordre ?? 0) + 1;
    await this.forfaits.save(
      this.forfaits.create({
        fonctionnalites: [],
        points: [],
        ...champs,
        ordre,
      }),
    );
    await this.recharger();
    return this.administration();
  }

  async modifier(code: string, champs: Partial<Forfait>) {
    const f = await this.forfaits.findOneBy({ code });
    if (!f) throw new NotFoundException('Forfait introuvable.');
    delete champs.code;
    for (const cle of ['stripePrixMensuelId', 'stripePrixAnnuelId'] as const)
      if (champs[cle] === '') champs[cle] = null;
    await this.forfaits.save(Object.assign(f, champs));
    await this.recharger();
    return this.administration();
  }

  async supprimer(code: string) {
    const p = parametresEnCache();
    if (code === p?.forfaitDefaut || code === p?.forfaitEssai)
      throw new BadRequestException(
        "Ce forfait est utilisé comme forfait par défaut ou d'essai : changez d'abord les réglages.",
      );
    const n = await this.garderies.countBy({ plan: code });
    if (n)
      throw new ConflictException(
        `${n} garderie(s) utilisent ce forfait : changez-les de forfait ou masquez-le plutôt.`,
      );
    const res = await this.forfaits.delete({ code });
    if (!res.affected) throw new NotFoundException('Forfait introuvable.');
    await this.recharger();
    return this.administration();
  }

  async modifierParametres(champs: Partial<ParametresPlateforme>) {
    if (champs.forfaitDefaut === null)
      throw new BadRequestException("Le forfait d'inscription est requis.");
    for (const cle of ['forfaitDefaut', 'forfaitEssai'] as const)
      if (champs[cle] && !forfait(champs[cle]))
        throw new BadRequestException(`Forfait inconnu : ${champs[cle]}.`);
    await this.parametres.update({ id: 1 }, champs);
    await this.recharger();
    return this.administration();
  }
}
