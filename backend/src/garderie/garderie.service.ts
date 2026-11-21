import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, MoreThan, Repository } from 'typeorm';
import { ageEnMois, groupePourAge } from '../common/age';
import { AuditService } from '../common/audit.service';
import { dateDuJour } from '../common/dates';
import { UtilisateurConnecte } from '../common/auth.decorators';
import {
  fonctionnalitesDe,
  limitesDe,
  planEffectif,
  verifierLimite,
} from '../common/fonctionnalites';
import { Role, ROLES_PERSONNEL, StatutEnfant } from '../common/enums';
import { InvitationsService } from '../auth/invitations.service';
import {
  Adhesion,
  Enfant,
  Garderie,
  Groupe,
  Invitation,
  Utilisateur,
} from '../entities';
import {
  GroupeDto,
  InviterPersonnelDto,
  ModifierGarderieDto,
  ModifierGroupeDto,
  ModifierMembreDto,
} from './garderie.dto';

@Injectable()
export class GarderieService {
  constructor(
    private readonly audit: AuditService,
    private readonly invitationsService: InvitationsService,
    @InjectRepository(Garderie)
    private readonly garderies: Repository<Garderie>,
    @InjectRepository(Groupe) private readonly groupes: Repository<Groupe>,
    @InjectRepository(Adhesion)
    private readonly adhesions: Repository<Adhesion>,
    @InjectRepository(Invitation)
    private readonly invitations: Repository<Invitation>,
    @InjectRepository(Enfant) private readonly enfants: Repository<Enfant>,
  ) {}

  async obtenir(user: UtilisateurConnecte) {
    const g = await this.garderies.findOneByOrFail({ id: user.garderieId! });
    const [enfants, personnel] = await Promise.all([
      this.enfants.countBy({ garderieId: g.id, statut: StatutEnfant.ACTIF }),
      this.comptePersonnel(g.id),
    ]);
    return {
      ...g,
      planEffectif: planEffectif(g),
      fonctionnalites: fonctionnalitesDe(g),
      limites: limitesDe(g),
      utilisation: { enfants, personnel },
    };
  }

  /** Personnel actif + invitations du personnel en attente. */
  private async comptePersonnel(garderieId: number) {
    const [membres, invitations] = await Promise.all([
      this.adhesions.countBy({
        garderieId,
        role: In(ROLES_PERSONNEL),
        actif: true,
      }),
      this.invitations.countBy({
        garderieId,
        role: In(ROLES_PERSONNEL),
        accepteeLe: IsNull(),
        expireLe: MoreThan(new Date()),
      }),
    ]);
    return membres + invitations;
  }

  async modifier(user: UtilisateurConnecte, dto: ModifierGarderieDto) {
    if (dto.fuseauHoraire) {
      try {
        new Intl.DateTimeFormat('fr-CA', { timeZone: dto.fuseauHoraire });
      } catch {
        throw new BadRequestException('Fuseau horaire invalide.');
      }
    }
    await this.garderies.update({ id: user.garderieId! }, dto);
    await this.audit.consigner(user, 'garderie.modifiee');
    return this.obtenir(user);
  }

  // ---------- Groupes ----------

  async listerGroupes(user: UtilisateurConnecte) {
    const groupes = await this.groupes.find({
      where: { garderieId: user.garderieId! },
      relations: { gestionnaires: true },
      order: { ageMinMois: 'ASC', nom: 'ASC' },
    });
    const comptes: { groupeId: number; total: string }[] = await this.enfants
      .createQueryBuilder('e')
      .select('e.groupeId', 'groupeId')
      .addSelect('COUNT(*)', 'total')
      .where('e.garderieId = :g AND e.statut = :s', {
        g: user.garderieId,
        s: StatutEnfant.ACTIF,
      })
      .groupBy('e.groupeId')
      .getRawMany();
    return groupes.map((g) => ({
      ...g,
      gestionnaires: g.gestionnaires.map(({ id, prenom, nom }) => ({
        id,
        prenom,
        nom,
      })),
      nombreEnfants: Number(
        comptes.find((c) => Number(c.groupeId) === g.id)?.total ?? 0,
      ),
    }));
  }

  private async gestionnairesValides(
    garderieId: number,
    ids: number[] = [],
  ): Promise<Utilisateur[]> {
    if (!ids.length) return [];
    const membres = await this.adhesions.find({
      where: {
        garderieId,
        utilisateurId: In(ids),
        role: In(ROLES_PERSONNEL),
        actif: true,
      },
    });
    const valides = new Set(membres.map((m) => m.utilisateurId));
    if (ids.some((id) => !valides.has(id)))
      throw new BadRequestException(
        'Gestionnaire invalide pour cette garderie.',
      );
    return ids.map((id) => ({ id }) as Utilisateur);
  }

  private verifierTranche(min?: number | null, max?: number | null) {
    if (min != null && max != null && min >= max)
      throw new BadRequestException(
        "L'âge maximum doit être plus grand que l'âge minimum.",
      );
  }

  async creerGroupe(user: UtilisateurConnecte, dto: GroupeDto) {
    this.verifierTranche(dto.ageMinMois, dto.ageMaxMois);
    const { gestionnaireIds, ...champs } = dto;
    const groupe = await this.groupes.save(
      this.groupes.create({
        ...champs,
        garderieId: user.garderieId!,
        gestionnaires: await this.gestionnairesValides(
          user.garderieId!,
          gestionnaireIds,
        ),
      }),
    );
    await this.audit.consigner(user, 'groupe.cree', `groupe:${groupe.id}`);
    return groupe;
  }

  private async trouverGroupe(user: UtilisateurConnecte, id: number) {
    const groupe = await this.groupes.findOne({
      where: { id, garderieId: user.garderieId! },
      relations: { gestionnaires: true },
    });
    if (!groupe) throw new NotFoundException('Groupe introuvable.');
    return groupe;
  }

  async modifierGroupe(
    user: UtilisateurConnecte,
    id: number,
    dto: ModifierGroupeDto,
  ) {
    const groupe = await this.trouverGroupe(user, id);
    const { gestionnaireIds, ...champs } = dto;
    Object.assign(groupe, champs);
    this.verifierTranche(groupe.ageMinMois, groupe.ageMaxMois);
    if (gestionnaireIds)
      groupe.gestionnaires = await this.gestionnairesValides(
        user.garderieId!,
        gestionnaireIds,
      );
    await this.groupes.save(groupe);
    return this.trouverGroupe(user, id);
  }

  /** Enfants dont le groupe ne correspond plus à leur âge. */
  async apercuReaffectation(user: UtilisateurConnecte) {
    const garderie = await this.obtenir(user);
    const aujourdhui = dateDuJour(garderie.fuseauHoraire);
    const [groupes, enfants] = await Promise.all([
      this.groupes.findBy({ garderieId: garderie.id }),
      this.enfants.find({
        where: { garderieId: garderie.id, statut: StatutEnfant.ACTIF },
        order: { dateNaissance: 'DESC' },
      }),
    ]);
    return enfants.flatMap((e) => {
      const ageMois = ageEnMois(e.dateNaissance, aujourdhui);
      const suggere = groupePourAge(groupes, ageMois);
      if (!suggere || suggere.id === e.groupeId) return [];
      const actuel = groupes.find((g) => g.id === e.groupeId);
      return [
        {
          enfant: { id: e.id, prenom: e.prenom, nom: e.nom },
          ageMois,
          actuel: actuel ? { id: actuel.id, nom: actuel.nom } : null,
          suggere: { id: suggere.id, nom: suggere.nom },
        },
      ];
    });
  }

  async reaffecter(user: UtilisateurConnecte, enfantIds: number[]) {
    const apercu = await this.apercuReaffectation(user);
    const choisis = apercu.filter((a) => enfantIds.includes(a.enfant.id));
    for (const a of choisis)
      await this.enfants.update(
        { id: a.enfant.id, garderieId: user.garderieId! },
        { groupeId: a.suggere.id },
      );
    if (choisis.length)
      await this.audit.consigner(user, 'groupes.reaffectation', undefined, {
        deplacements: choisis.map((a) => [a.enfant.id, a.suggere.id]),
      });
    return { deplaces: choisis.length };
  }

  async supprimerGroupe(user: UtilisateurConnecte, id: number) {
    const groupe = await this.trouverGroupe(user, id);
    await this.groupes.remove(groupe);
    await this.audit.consigner(user, 'groupe.supprime', `groupe:${id}`, {
      nom: groupe.nom,
    });
  }

  // ---------- Personnel ----------

  async listerPersonnel(user: UtilisateurConnecte) {
    const membres = await this.adhesions.find({
      where: { garderieId: user.garderieId!, role: In(ROLES_PERSONNEL) },
      relations: { utilisateur: true },
      order: { creeLe: 'ASC' },
    });
    const invitations = await this.invitations.find({
      where: {
        garderieId: user.garderieId!,
        role: In(ROLES_PERSONNEL),
        accepteeLe: IsNull(),
        expireLe: MoreThan(new Date()),
      },
      order: { creeLe: 'DESC' },
    });
    return {
      membres: membres.map((m) => ({
        adhesionId: m.id,
        role: m.role,
        actif: m.actif,
        depuis: m.creeLe,
        utilisateur: {
          id: m.utilisateur.id,
          prenom: m.utilisateur.prenom,
          nom: m.utilisateur.nom,
          courriel: m.utilisateur.courriel,
          telephone: m.utilisateur.telephone,
        },
      })),
      invitations: invitations.map(
        ({ id, courriel, prenom, nom, role, expireLe, creeLe }) => ({
          id,
          courriel,
          prenom,
          nom,
          role,
          expireLe,
          creeLe,
        }),
      ),
    };
  }

  async inviterPersonnel(user: UtilisateurConnecte, dto: InviterPersonnelDto) {
    const g = await this.garderies.findOneByOrFail({ id: user.garderieId! });
    verifierLimite(g, 'personnel', await this.comptePersonnel(g.id));
    const dejaMembre = await this.adhesions
      .createQueryBuilder('a')
      .innerJoin('a.utilisateur', 'u')
      .where(
        'a.garderieId = :g AND a.role = :r AND a.actif = 1 AND u.courriel = :c',
        {
          g: user.garderieId,
          r: dto.role,
          c: dto.courriel,
        },
      )
      .getExists();
    if (dejaMembre)
      throw new ConflictException(
        'Cette personne fait déjà partie du personnel avec ce rôle.',
      );
    if (dto.groupeIds?.length) {
      const n = await this.groupes.countBy({
        id: In(dto.groupeIds),
        garderieId: user.garderieId!,
      });
      if (n !== dto.groupeIds.length)
        throw new BadRequestException('Groupe invalide.');
    }
    const { invitation: inv, lienInvitation } =
      await this.invitationsService.creer(user, dto);
    return {
      id: inv.id,
      courriel: inv.courriel,
      role: inv.role,
      expireLe: inv.expireLe,
      lienInvitation,
    };
  }

  renvoyerInvitation(user: UtilisateurConnecte, id: number) {
    return this.invitationsService.renvoyer(user, id, {
      roles: ROLES_PERSONNEL,
    });
  }

  /** Avancement de la mise en route de la garderie (liste de démarrage). */
  async demarrage(user: UtilisateurConnecte) {
    const garderieId = user.garderieId!;
    const [groupes, personnel, enfants, parents, invitationsParents] =
      await Promise.all([
        this.groupes.countBy({ garderieId }),
        this.adhesions.countBy({
          garderieId,
          role: In(ROLES_PERSONNEL),
          actif: true,
        }),
        this.enfants.countBy({ garderieId, statut: StatutEnfant.ACTIF }),
        this.adhesions.countBy({ garderieId, role: Role.PARENT, actif: true }),
        this.invitations.countBy({
          garderieId,
          role: Role.PARENT,
          accepteeLe: IsNull(),
          expireLe: MoreThan(new Date()),
        }),
      ]);
    const invitationsPersonnel = await this.invitations.countBy({
      garderieId,
      role: In(ROLES_PERSONNEL),
      accepteeLe: IsNull(),
      expireLe: MoreThan(new Date()),
    });
    return {
      groupes,
      personnel,
      invitationsPersonnel,
      enfants,
      parents,
      invitationsParents,
    };
  }

  async annulerInvitation(user: UtilisateurConnecte, id: number) {
    const res = await this.invitations.delete({
      id,
      garderieId: user.garderieId!,
      accepteeLe: IsNull(),
    });
    if (!res.affected) throw new NotFoundException('Invitation introuvable.');
  }

  async modifierMembre(
    user: UtilisateurConnecte,
    adhesionId: number,
    dto: ModifierMembreDto,
  ) {
    if (adhesionId === user.adhesionId)
      throw new BadRequestException(
        'Vous ne pouvez pas modifier votre propre accès.',
      );
    const membre = await this.adhesions.findOneBy({
      id: adhesionId,
      garderieId: user.garderieId!,
      role: In(ROLES_PERSONNEL),
    });
    if (!membre) throw new NotFoundException('Membre introuvable.');
    if (dto.actif && !membre.actif) {
      const g = await this.garderies.findOneByOrFail({ id: user.garderieId! });
      verifierLimite(g, 'personnel', await this.comptePersonnel(g.id));
    }
    Object.assign(membre, dto);
    await this.adhesions.save(membre);
    await this.audit.consigner(
      user,
      'personnel.modifie',
      `adhesion:${adhesionId}`,
      { ...dto },
    );
    return membre;
  }
}
