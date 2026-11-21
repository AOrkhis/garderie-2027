import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditService } from '../common/audit.service';
import { UtilisateurConnecte } from '../common/auth.decorators';
import { dateDuJour, heureActuelle } from '../common/dates';
import { Role, StatutEnfant, TypeEntree } from '../common/enums';
import { EnfantsService } from '../enfants/enfants.service';
import { Enfant, EntreeJournal, Garderie } from '../entities';
import { PhotosService } from '../photos/photos.service';
import { CreerEntreeDto, ModifierEntreeDto } from './journal.dto';
import { MOMENTS_REPAS, nettoyerDonnees } from './schemas';

const minutes = (h: string) =>
  Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

@Injectable()
export class JournalService {
  constructor(
    private readonly audit: AuditService,
    private readonly enfantsService: EnfantsService,
    private readonly photosService: PhotosService,
    @InjectRepository(EntreeJournal)
    private readonly entrees: Repository<EntreeJournal>,
    @InjectRepository(Enfant) private readonly enfants: Repository<Enfant>,
    @InjectRepository(Garderie)
    private readonly garderies: Repository<Garderie>,
  ) {}

  private async garderie(user: UtilisateurConnecte) {
    return this.garderies.findOneByOrFail({ id: user.garderieId! });
  }

  private serialiser(e: EntreeJournal) {
    return {
      id: e.id,
      enfantId: e.enfantId,
      date: e.date,
      heure: e.heure,
      type: e.type,
      donnees: e.donnees,
      auteur: e.auteur
        ? { id: e.auteur.id, prenom: e.auteur.prenom, nom: e.auteur.nom }
        : null,
      photos: (e.photos ?? []).map((p) => this.photosService.serialiser(p)),
      creeLe: e.creeLe,
      modifieLe: e.modifieLe,
    };
  }

  static resume(
    entrees: Pick<EntreeJournal, 'type' | 'heure' | 'donnees' | 'photos'>[],
  ) {
    const d = (e: (typeof entrees)[number]) =>
      e.donnees as Record<string, string>;
    const de = (t: TypeEntree) => entrees.filter((e) => e.type === t);
    const siestes = de(TypeEntree.SIESTE);
    return {
      arrivee: de(TypeEntree.ARRIVEE)[0]?.heure ?? null,
      depart: de(TypeEntree.DEPART).at(-1)?.heure ?? null,
      repas: de(TypeEntree.REPAS)
        .map((e) => ({ moment: d(e).moment, quantite: d(e).quantite }))
        .sort(
          (a, b) =>
            MOMENTS_REPAS.indexOf(a.moment) - MOMENTS_REPAS.indexOf(b.moment),
        ),
      siesteMinutes: siestes.reduce(
        (t, e) =>
          d(e).fin
            ? t + Math.max(0, minutes(d(e).fin) - minutes(d(e).debut))
            : t,
        0,
      ),
      siesteEnCours: siestes.some((e) => !d(e).fin),
      humeur: de(TypeEntree.HUMEUR).at(-1)
        ? d(de(TypeEntree.HUMEUR).at(-1)!).humeur
        : null,
      nombreActivites: de(TypeEntree.ACTIVITE).length,
      nombrePhotos: new Set(
        entrees.flatMap((e) => (e.photos ?? []).map((p) => p.id)),
      ).size,
      nombreRemarques: de(TypeEntree.REMARQUE).length,
      remarqueImportante: de(TypeEntree.REMARQUE).some(
        (e) => d(e).importance === 'IMPORTANT',
      ),
    };
  }

  private static presence(entrees: Pick<EntreeJournal, 'type'>[]) {
    const dernier = [...entrees]
      .reverse()
      .find(
        (e) => e.type === TypeEntree.ARRIVEE || e.type === TypeEntree.DEPART,
      );
    return !dernier
      ? 'ABSENT'
      : dernier.type === TypeEntree.ARRIVEE
        ? 'PRESENT'
        : 'PARTI';
  }

  async journalEnfant(
    user: UtilisateurConnecte,
    enfantId: number,
    date?: string,
  ) {
    await this.enfantsService.verifierAcces(user, enfantId);
    const g = await this.garderie(user);
    const jour = date ?? dateDuJour(g.fuseauHoraire);
    const entrees = await this.entrees.find({
      where: { enfantId, garderieId: g.id, date: jour },
      relations: { auteur: true, photos: true },
      order: { heure: 'ASC', id: 'ASC' },
    });
    return {
      date: jour,
      aujourdhui: dateDuJour(g.fuseauHoraire),
      presence: JournalService.presence(entrees),
      resume: JournalService.resume(entrees),
      entrees: entrees.map((e) => this.serialiser(e)),
    };
  }

  async vueDuJour(user: UtilisateurConnecte, groupeId?: number, date?: string) {
    const g = await this.garderie(user);
    const jour = date ?? dateDuJour(g.fuseauHoraire);
    const enfants = await this.enfants.find({
      where: {
        garderieId: g.id,
        statut: StatutEnfant.ACTIF,
        ...(groupeId ? { groupeId } : {}),
      },
      relations: { groupe: true },
      order: { prenom: 'ASC', nom: 'ASC' },
    });
    const entrees = enfants.length
      ? await this.entrees.find({
          where: { enfantId: In(enfants.map((e) => e.id)), date: jour },
          relations: { photos: true },
          order: { heure: 'ASC', id: 'ASC' },
        })
      : [];
    return {
      date: jour,
      aujourdhui: dateDuJour(g.fuseauHoraire),
      enfants: enfants.map((e) => {
        const siennes = entrees.filter((x) => x.enfantId === e.id);
        return {
          id: e.id,
          prenom: e.prenom,
          nom: e.nom,
          dateNaissance: e.dateNaissance,
          allergies: e.allergies,
          consentementPhoto: e.consentementPhoto,
          groupe: e.groupe
            ? { id: e.groupe.id, nom: e.groupe.nom, couleur: e.groupe.couleur }
            : null,
          presence: JournalService.presence(siennes),
          resume: JournalService.resume(siennes),
          nombreEntrees: siennes.length,
          derniereEntree: siennes.length
            ? (({ id, type, heure, donnees }) => ({
                id,
                type,
                heure,
                donnees,
              }))(siennes.at(-1)!)
            : null,
          siesteEnCours:
            siennes
              .filter(
                (x) =>
                  x.type === TypeEntree.SIESTE &&
                  !(x.donnees as Record<string, string>).fin,
              )
              .map(({ id, donnees }) => ({
                id,
                debut: (donnees as Record<string, string>).debut,
              }))
              .at(-1) ?? null,
        };
      }),
    };
  }

  /** N'importe quel membre du personnel peut terminer une sieste en cours (travail d'équipe). */
  async terminerSieste(user: UtilisateurConnecte, id: number, fin?: string) {
    const entree = await this.entrees.findOneBy({
      id,
      garderieId: user.garderieId!,
      type: TypeEntree.SIESTE,
    });
    if (!entree) throw new NotFoundException('Sieste introuvable.');
    const g = await this.garderie(user);
    const donnees = entree.donnees as Record<string, string>;
    const heureFin = fin ?? heureActuelle(g.fuseauHoraire);
    if (heureFin < donnees.debut)
      throw new BadRequestException(
        "L'heure de fin doit être après le début de la sieste.",
      );
    entree.donnees = nettoyerDonnees(TypeEntree.SIESTE, {
      ...donnees,
      fin: heureFin,
    });
    await this.entrees.save(entree);
    return (await this.recharger([id]))[0];
  }

  async creer(user: UtilisateurConnecte, dto: CreerEntreeDto) {
    const g = await this.garderie(user);
    const aujourdhui = dateDuJour(g.fuseauHoraire);
    const date = dto.date?.slice(0, 10) ?? aujourdhui;
    if (date > aujourdhui)
      throw new BadRequestException(
        'Impossible de créer une entrée dans le futur.',
      );

    const enfants = await this.enfants.findBy({
      id: In(dto.enfantIds),
      garderieId: g.id,
      statut: StatutEnfant.ACTIF,
    });
    if (enfants.length !== dto.enfantIds.length)
      throw new BadRequestException('Enfant invalide.');
    const photos = await this.photosService.verifierPhotos(
      user,
      dto.photoIds ?? [],
    );
    const sansConsentement = photos.length
      ? enfants.filter((e) => !e.consentementPhoto)
      : [];
    if (sansConsentement.length)
      throw new BadRequestException(
        `Pas de consentement photo pour : ${sansConsentement.map((e) => e.prenom).join(', ')}.`,
      );
    const donnees = nettoyerDonnees(dto.type, dto.donnees);
    const heure = dto.heure ?? heureActuelle(g.fuseauHoraire);

    const creees = await this.entrees.save(
      enfants.map((e) =>
        this.entrees.create({
          garderieId: g.id,
          enfantId: e.id,
          auteurId: user.utilisateurId,
          date,
          heure,
          type: dto.type,
          donnees,
          photos,
        }),
      ),
    );
    return this.recharger(creees.map((e) => e.id));
  }

  private async recharger(ids: number[]) {
    const entrees = await this.entrees.find({
      where: { id: In(ids) },
      relations: { auteur: true, photos: true },
    });
    return entrees.map((e) => this.serialiser(e));
  }

  private async modifiable(user: UtilisateurConnecte, id: number) {
    const entree = await this.entrees.findOne({
      where: { id, garderieId: user.garderieId! },
      relations: { photos: true },
    });
    if (!entree) throw new NotFoundException('Entrée introuvable.');
    if (user.role !== Role.ADMIN && entree.auteurId !== user.utilisateurId)
      throw new ForbiddenException(
        "Seul l'auteur ou un administrateur peut modifier cette entrée.",
      );
    const g = await this.garderie(user);
    if (user.role !== Role.ADMIN && entree.date !== dateDuJour(g.fuseauHoraire))
      throw new ForbiddenException(
        'Une entrée ne peut être modifiée que le jour même.',
      );
    return entree;
  }

  async modifier(
    user: UtilisateurConnecte,
    id: number,
    dto: ModifierEntreeDto,
  ) {
    const entree = await this.modifiable(user, id);
    if (dto.heure) entree.heure = dto.heure;
    if (dto.donnees) entree.donnees = nettoyerDonnees(entree.type, dto.donnees);
    if (dto.photoIds)
      entree.photos = await this.photosService.verifierPhotos(
        user,
        dto.photoIds,
      );
    await this.entrees.save(entree);
    return (await this.recharger([id]))[0];
  }

  async supprimer(user: UtilisateurConnecte, id: number) {
    const entree = await this.modifiable(user, id);
    await this.entrees.remove(entree);
    await this.audit.consigner(
      user,
      'journal.entree_supprimee',
      `entree:${id}`,
      { enfantId: entree.enfantId, type: entree.type },
    );
  }
}
