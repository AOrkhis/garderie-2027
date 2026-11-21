import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { ageEnMois, groupePourAge } from '../common/age';
import { AuditService } from '../common/audit.service';
import { UtilisateurConnecte } from '../common/auth.decorators';
import { dateDuJour } from '../common/dates';
import { Role, StatutEnfant } from '../common/enums';
import { MailService } from '../common/mail.service';
import { InvitationsService } from '../auth/invitations.service';
import {
  Adhesion,
  ContactUrgence,
  Enfant,
  EntreeJournal,
  Garderie,
  Groupe,
  Invitation,
  ParentEnfant,
  Utilisateur,
} from '../entities';
import {
  AjouterParentDto,
  EnfantDto,
  FiltreEnfantsDto,
  ModifierEnfantDto,
} from './enfants.dto';

@Injectable()
export class EnfantsService {
  constructor(
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly invitationsService: InvitationsService,
    @InjectRepository(Enfant) private readonly enfants: Repository<Enfant>,
    @InjectRepository(Groupe) private readonly groupes: Repository<Groupe>,
    @InjectRepository(ParentEnfant)
    private readonly liens: Repository<ParentEnfant>,
    @InjectRepository(Invitation)
    private readonly invitations: Repository<Invitation>,
    @InjectRepository(Utilisateur)
    private readonly utilisateurs: Repository<Utilisateur>,
    @InjectRepository(Adhesion)
    private readonly adhesions: Repository<Adhesion>,
    @InjectRepository(Garderie)
    private readonly garderies: Repository<Garderie>,
    @InjectRepository(EntreeJournal)
    private readonly entrees: Repository<EntreeJournal>,
  ) {}

  /** Vérifie que l'utilisateur a accès à l'enfant (même garderie, et lien parental pour un parent). */
  async verifierAcces(
    user: UtilisateurConnecte,
    enfantId: number,
  ): Promise<Enfant> {
    const enfant = await this.enfants.findOneBy({
      id: enfantId,
      garderieId: user.garderieId!,
    });
    if (!enfant) throw new NotFoundException('Enfant introuvable.');
    if (
      user.role === Role.PARENT &&
      !(await this.liens.existsBy({ enfantId, parentId: user.utilisateurId }))
    )
      throw new NotFoundException('Enfant introuvable.');
    return enfant;
  }

  private async verifierGroupe(
    user: UtilisateurConnecte,
    groupeId?: number | null,
  ) {
    if (
      groupeId &&
      !(await this.groupes.existsBy({
        id: groupeId,
        garderieId: user.garderieId!,
      }))
    )
      throw new BadRequestException('Groupe invalide.');
  }

  lister(user: UtilisateurConnecte, filtre: FiltreEnfantsDto) {
    return this.enfants.find({
      where: {
        garderieId: user.garderieId!,
        statut: filtre.statut ?? StatutEnfant.ACTIF,
        ...(filtre.groupeId ? { groupeId: filtre.groupeId } : {}),
      },
      relations: { groupe: true },
      order: { prenom: 'ASC', nom: 'ASC' },
    });
  }

  /** Identifiant du groupe dont la tranche d'âge correspond à l'enfant (ou null). */
  private async groupeSelonAge(garderieId: number, dateNaissance: string) {
    const garderie = await this.garderies.findOneByOrFail({ id: garderieId });
    const groupes = await this.groupes.findBy({ garderieId });
    return (
      groupePourAge(
        groupes,
        ageEnMois(dateNaissance, dateDuJour(garderie.fuseauHoraire)),
      )?.id ?? null
    );
  }

  async creer(user: UtilisateurConnecte, dto: EnfantDto) {
    await this.verifierGroupe(user, dto.groupeId);
    // Sans groupe précisé : affectation automatique selon l'âge de l'enfant.
    const groupeId =
      dto.groupeId === undefined
        ? await this.groupeSelonAge(user.garderieId!, dto.dateNaissance)
        : dto.groupeId;
    const enfant = await this.enfants.save(
      this.enfants.create({ ...dto, groupeId, garderieId: user.garderieId! }),
    );
    await this.audit.consigner(user, 'enfant.inscrit', `enfant:${enfant.id}`);
    return this.obtenir(user, enfant.id);
  }

  async obtenir(user: UtilisateurConnecte, id: number) {
    await this.verifierAcces(user, id);
    const enfant = await this.enfants.findOneOrFail({
      where: { id },
      relations: {
        groupe: true,
        contactsUrgence: true,
        parents: { parent: true },
      },
    });
    return {
      ...enfant,
      parents: enfant.parents.map((p) => ({
        id: p.parent.id,
        prenom: p.parent.prenom,
        nom: p.parent.nom,
        courriel: p.parent.courriel,
        telephone: p.parent.telephone,
        lien: p.lien,
      })),
    };
  }

  async modifier(
    user: UtilisateurConnecte,
    id: number,
    dto: ModifierEnfantDto,
  ) {
    const enfant = await this.verifierAcces(user, id);
    await this.verifierGroupe(user, dto.groupeId);
    const { contactsUrgence, groupeAuto, ...champs } = dto;
    // Groupe recalculé selon l'âge si demandé, ou si la date de naissance change
    // sans que le groupe ait été modifié manuellement dans la même requête.
    const dateChangee =
      !!dto.dateNaissance && dto.dateNaissance !== enfant.dateNaissance;
    const groupeInchange =
      dto.groupeId === undefined || dto.groupeId === enfant.groupeId;
    if (groupeAuto || (dateChangee && groupeInchange)) {
      const selonAge = await this.groupeSelonAge(
        user.garderieId!,
        dto.dateNaissance ?? enfant.dateNaissance,
      );
      if (selonAge || groupeAuto) champs.groupeId = selonAge;
    }
    await this.enfants.manager.transaction(async (m) => {
      await m.save(Object.assign(enfant, champs));
      if (contactsUrgence) {
        await m.delete(ContactUrgence, { enfantId: id });
        await m.save(
          contactsUrgence.map((c) =>
            m.create(ContactUrgence, { ...c, enfantId: id }),
          ),
        );
      }
    });
    if (dto.statut)
      await this.audit.consigner(
        user,
        `enfant.${dto.statut === StatutEnfant.ARCHIVE ? 'archive' : 'reactive'}`,
        `enfant:${id}`,
      );
    return this.obtenir(user, id);
  }

  async listerParents(user: UtilisateurConnecte, id: number) {
    const { parents } = await this.obtenir(user, id);
    const invitations = await this.invitations.find({
      where: {
        garderieId: user.garderieId!,
        enfantId: id,
        accepteeLe: IsNull(),
        expireLe: MoreThan(new Date()),
      },
      order: { creeLe: 'DESC' },
    });
    return {
      parents,
      invitations: invitations.map(
        ({ id, courriel, prenom, nom, lien, expireLe }) => ({
          id,
          courriel,
          prenom,
          nom,
          lien,
          expireLe,
        }),
      ),
    };
  }

  async ajouterParent(
    user: UtilisateurConnecte,
    enfantId: number,
    dto: AjouterParentDto,
  ) {
    const enfant = await this.verifierAcces(user, enfantId);
    const existant = await this.utilisateurs.findOneBy({
      courriel: dto.courriel,
    });
    const estParentIci =
      existant &&
      (await this.adhesions.existsBy({
        utilisateurId: existant.id,
        garderieId: user.garderieId!,
        role: Role.PARENT,
        actif: true,
      }));

    if (existant && estParentIci) {
      await this.liens.upsert(
        { parentId: existant.id, enfantId, lien: dto.lien },
        ['parentId', 'enfantId'],
      );
      const garderie = await this.garderies.findOneByOrFail({
        id: user.garderieId!,
      });
      await this.mail.envoyer(
        existant.courriel,
        `${enfant.prenom} a été ajouté à votre compte`,
        `Bonjour ${existant.prenom},\n\nLa garderie « ${garderie.nom} » a ajouté ${enfant.prenom} à votre compte. Vous pouvez maintenant suivre sa journée.`,
        `${this.mail.frontendUrl}/connexion`,
      );
      await this.audit.consigner(user, 'parent.lie', `enfant:${enfantId}`, {
        parentId: existant.id,
      });
      return { statut: 'lie' as const };
    }

    const { lienInvitation } = await this.invitationsService.creer(user, {
      ...dto,
      role: Role.PARENT,
      enfantId,
    });
    return { statut: 'invite' as const, lienInvitation };
  }

  async renvoyerInvitationParent(
    user: UtilisateurConnecte,
    enfantId: number,
    invitationId: number,
  ) {
    await this.verifierAcces(user, enfantId);
    return this.invitationsService.renvoyer(user, invitationId, {
      roles: [Role.PARENT],
      enfantId,
    });
  }

  async retirerParent(
    user: UtilisateurConnecte,
    enfantId: number,
    parentId: number,
  ) {
    await this.verifierAcces(user, enfantId);
    const res = await this.liens.delete({ enfantId, parentId });
    if (!res.affected) throw new NotFoundException('Parent introuvable.');
    await this.audit.consigner(user, 'parent.retire', `enfant:${enfantId}`, {
      parentId,
    });
  }

  async annulerInvitationParent(
    user: UtilisateurConnecte,
    enfantId: number,
    invitationId: number,
  ) {
    await this.verifierAcces(user, enfantId);
    const res = await this.invitations.delete({
      id: invitationId,
      enfantId,
      garderieId: user.garderieId!,
      accepteeLe: IsNull(),
    });
    if (!res.affected) throw new NotFoundException('Invitation introuvable.');
  }

  async mesEnfants(user: UtilisateurConnecte) {
    const garderie = await this.garderies.findOneByOrFail({
      id: user.garderieId!,
    });
    const aujourdhui = dateDuJour(garderie.fuseauHoraire);
    const enfants = await this.enfants
      .createQueryBuilder('e')
      .innerJoin(
        ParentEnfant,
        'pe',
        'pe.enfantId = e.id AND pe.parentId = :p',
        { p: user.utilisateurId },
      )
      .leftJoinAndSelect('e.groupe', 'g')
      .where('e.garderieId = :g', { g: user.garderieId })
      .orderBy('e.prenom', 'ASC')
      .getMany();
    return Promise.all(
      enfants.map(async (e) => ({
        ...e,
        derniereEntree: await this.entrees.findOne({
          where: { enfantId: e.id, date: aujourdhui },
          order: { heure: 'DESC', id: 'DESC' },
        }),
        nombreEntreesAujourdhui: await this.entrees.countBy({
          enfantId: e.id,
          date: aujourdhui,
        }),
      })),
    );
  }
}
