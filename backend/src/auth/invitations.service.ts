import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, In, IsNull, MoreThan, Repository } from 'typeorm';
import { AuditService } from '../common/audit.service';
import { UtilisateurConnecte } from '../common/auth.decorators';
import { LienParent, Role } from '../common/enums';
import { genererJeton, hacherJeton } from '../common/jetons';
import { MailService } from '../common/mail.service';
import {
  Adhesion,
  Enfant,
  Garderie,
  Groupe,
  Invitation,
  ParentEnfant,
  Utilisateur,
} from '../entities';
import { AccepterInvitationDto } from './auth.dto';
import { AuthService, hacherMotDePasse } from './auth.service';

export interface NouvelleInvitation {
  courriel: string;
  prenom?: string | null;
  nom?: string | null;
  role: Role;
  enfantId?: number | null;
  lien?: LienParent | null;
  groupeIds?: number[] | null;
}

const LIBELLES_ROLE: Record<Role, string> = {
  [Role.ADMIN]: 'administrateur',
  [Role.GESTIONNAIRE]: 'gestionnaire',
  [Role.PARENT]: 'parent',
};

@Injectable()
export class InvitationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
    @InjectRepository(Invitation)
    private readonly invitations: Repository<Invitation>,
    @InjectRepository(Garderie)
    private readonly garderies: Repository<Garderie>,
  ) {}

  async creer(auteur: UtilisateurConnecte, inv: NouvelleInvitation) {
    const garderieId = auteur.garderieId!;
    const courriel = inv.courriel.trim().toLowerCase();
    await this.invitations.delete({
      garderieId,
      courriel,
      role: inv.role,
      enfantId: inv.enfantId ?? IsNull(),
      accepteeLe: IsNull(),
    });
    const { jeton, hash } = genererJeton();
    const invitation = await this.invitations.save(
      this.invitations.create({
        garderieId,
        courriel,
        prenom: inv.prenom ?? null,
        nom: inv.nom ?? null,
        role: inv.role,
        jetonHash: hash,
        enfantId: inv.enfantId ?? null,
        lien: inv.lien ?? null,
        groupeIds: inv.groupeIds?.length ? inv.groupeIds : null,
        inviteParId: auteur.utilisateurId,
        expireLe: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
    );

    const garderie = await this.garderies.findOneByOrFail({ id: garderieId });
    const enfant = inv.enfantId
      ? await this.dataSource
          .getRepository(Enfant)
          .findOneBy({ id: inv.enfantId })
      : null;
    const salutation = inv.prenom ? `Bonjour ${inv.prenom},` : 'Bonjour,';
    const texte =
      inv.role === Role.PARENT
        ? `${salutation}\n\nLa garderie « ${garderie.nom} » vous invite à suivre la journée de ${enfant?.prenom ?? 'votre enfant'} sur Garderie 2027 : activités, repas, siestes et photos.\n\nCliquez sur le lien ci-dessous pour activer votre compte (valide 7 jours).`
        : `${salutation}\n\nLa garderie « ${garderie.nom} » vous invite à rejoindre son équipe sur Garderie 2027 en tant que ${LIBELLES_ROLE[inv.role]}.\n\nCliquez sur le lien ci-dessous pour activer votre compte (valide 7 jours).`;
    const lien = `${this.mail.frontendUrl}/invitation/${jeton}`;
    await this.mail.envoyer(
      courriel,
      `Invitation — ${garderie.nom}`,
      texte,
      lien,
    );
    await this.audit.consigner(
      auteur,
      'invitation.envoyee',
      `invitation:${invitation.id}`,
      { courriel, role: inv.role },
    );
    // Sans SMTP (développement), le lien est renvoyé pour être copié depuis l'interface.
    return {
      invitation,
      lienInvitation: this.mail.modeConsole ? lien : undefined,
    };
  }

  /** Génère un nouveau lien (valide 7 jours) pour une invitation en attente. */
  async renvoyer(
    auteur: UtilisateurConnecte,
    id: number,
    filtre: { roles: Role[]; enfantId?: number },
  ) {
    const inv = await this.invitations.findOneBy({
      id,
      garderieId: auteur.garderieId!,
      role: In(filtre.roles),
      accepteeLe: IsNull(),
      ...(filtre.enfantId ? { enfantId: filtre.enfantId } : {}),
    });
    if (!inv) throw new NotFoundException('Invitation introuvable.');
    const { lienInvitation, invitation } = await this.creer(auteur, inv);
    return { id: invitation.id, lienInvitation };
  }

  private async trouverValide(jeton: string) {
    const invitation = await this.invitations.findOne({
      where: {
        jetonHash: hacherJeton(jeton),
        accepteeLe: IsNull(),
        expireLe: MoreThan(new Date()),
      },
      relations: { garderie: true, enfant: true },
    });
    if (!invitation)
      throw new NotFoundException(
        'Cette invitation est invalide, expirée ou déjà utilisée.',
      );
    return invitation;
  }

  async info(jeton: string) {
    const inv = await this.trouverValide(jeton);
    const compteExiste = await this.dataSource
      .getRepository(Utilisateur)
      .existsBy({ courriel: inv.courriel });
    return {
      courriel: inv.courriel,
      prenom: inv.prenom,
      nom: inv.nom,
      role: inv.role,
      garderie: { nom: inv.garderie.nom },
      enfant: inv.enfant ? { prenom: inv.enfant.prenom } : null,
      compteExiste,
    };
  }

  async accepter(jeton: string, dto: AccepterInvitationDto) {
    const inv = await this.trouverValide(jeton);

    const { user, adhesion } = await this.dataSource.transaction(async (m) => {
      let user = await m
        .getRepository(Utilisateur)
        .createQueryBuilder('u')
        .addSelect('u.motDePasseHash')
        .where('u.courriel = :c', { c: inv.courriel })
        .getOne();
      if (user) {
        if (!(await bcrypt.compare(dto.motDePasse, user.motDePasseHash)))
          throw new BadRequestException(
            'Mot de passe incorrect. Utilisez le mot de passe de votre compte existant.',
          );
      } else {
        const prenom = dto.prenom ?? inv.prenom;
        const nom = dto.nom ?? inv.nom;
        if (!prenom || !nom)
          throw new BadRequestException('Le prénom et le nom sont requis.');
        user = await m.save(
          m.create(Utilisateur, {
            courriel: inv.courriel,
            motDePasseHash: await hacherMotDePasse(dto.motDePasse),
            prenom,
            nom,
          }),
        );
      }

      // Le lien d'invitation prouve l'accès à la boîte : courriel confirmé.
      if (!user.courrielConfirmeLe) {
        user.courrielConfirmeLe = new Date();
        user = await m.save(user);
      }

      let adhesion = await m.findOneBy(Adhesion, {
        utilisateurId: user.id,
        garderieId: inv.garderieId,
        role: inv.role,
      });
      if (adhesion && adhesion.actif && inv.role !== Role.PARENT)
        throw new ConflictException(
          'Vous faites déjà partie de cette garderie avec ce rôle.',
        );
      adhesion = await m.save(
        Object.assign(
          adhesion ??
            m.create(Adhesion, {
              utilisateurId: user.id,
              garderieId: inv.garderieId,
              role: inv.role,
            }),
          {
            actif: true,
          },
        ),
      );

      if (inv.enfantId)
        await m.upsert(
          ParentEnfant,
          {
            parentId: user.id,
            enfantId: inv.enfantId,
            lien: inv.lien ?? LienParent.AUTRE,
          },
          ['parentId', 'enfantId'],
        );

      if (inv.groupeIds?.length) {
        const groupes = await m.find(Groupe, {
          where: inv.groupeIds.map((id) => ({
            id,
            garderieId: inv.garderieId,
          })),
        });
        for (const g of groupes)
          await m
            .createQueryBuilder()
            .relation(Groupe, 'gestionnaires')
            .of(g)
            .add(user.id)
            .catch(() => undefined);
      }

      await m.update(Invitation, { id: inv.id }, { accepteeLe: new Date() });
      return { user, adhesion };
    });

    await this.audit.consigner(
      { utilisateurId: user.id, garderieId: inv.garderieId },
      'invitation.acceptee',
      `invitation:${inv.id}`,
    );
    return this.auth.emettreJetons(user, adhesion.id);
  }
}
