import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { DataSource, In, MoreThan, Repository } from 'typeorm';
import { AuditService } from '../common/audit.service';
import { UtilisateurConnecte } from '../common/auth.decorators';
import {
  forfait,
  parametresEnCache,
  resumeForfait,
} from '../common/fonctionnalites';
import { Role, StatutGarderie } from '../common/enums';
import { genererJeton, hacherJeton } from '../common/jetons';
import { MailService } from '../common/mail.service';
import { Adhesion, Garderie, Utilisateur } from '../entities';
import {
  ChangerMotDePasseDto,
  ConnexionDto,
  InscriptionGarderieDto,
  ModifierProfilDto,
  ReinitialiserDto,
} from './auth.dto';
import { PayloadJwt } from './jwt.strategy';

const MAX_ECHECS = 5;
const FENETRE_ECHECS_MS = 15 * 60 * 1000;

export const hacherMotDePasse = (mdp: string) => bcrypt.hash(mdp, 12);

function slugifier(nom: string): string {
  const base = nom
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 140);
  return `${base || 'garderie'}-${randomBytes(3).toString('hex')}`;
}

function finEssai(jours: number) {
  const maintenant = new Date();
  return new Date(
    Date.UTC(
      maintenant.getUTCFullYear(),
      maintenant.getUTCMonth(),
      maintenant.getUTCDate() + jours,
      23,
      59,
      59,
      999,
    ),
  );
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly echecs = new Map<
    string,
    { nombre: number; depuis: number }
  >();

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly dataSource: DataSource,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    @InjectRepository(Utilisateur)
    private readonly utilisateurs: Repository<Utilisateur>,
    @InjectRepository(Adhesion)
    private readonly adhesions: Repository<Adhesion>,
  ) {}

  async onModuleInit() {
    const courriels = (this.config.get<string>('SUPER_ADMIN_COURRIELS') ?? '')
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);
    if (courriels.length)
      await this.utilisateurs.update(
        { courriel: In(courriels) },
        { estSuperAdmin: true },
      );
  }

  async emettreJetons(user: Utilisateur, adhesionId: number | null) {
    const payload: PayloadJwt = {
      sub: user.id,
      adh: adhesionId,
      v: user.versionJeton,
    };
    return {
      accessToken: await this.jwt.signAsync(payload),
      refreshToken: await this.jwt.signAsync(
        { ...payload, typ: 'refresh' },
        {
          secret: this.secretRefresh,
          expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') ?? '7d',
        },
      ),
    };
  }

  private get secretRefresh() {
    return `${this.config.getOrThrow<string>('JWT_SECRET')}:refresh`;
  }

  async adhesionParDefaut(
    utilisateurId: number,
    preferee?: number | null,
  ): Promise<Adhesion | null> {
    const liste = await this.adhesions.find({
      where: { utilisateurId, actif: true },
      relations: { garderie: true },
      order: { id: 'ASC' },
    });
    const actives = liste.filter(
      (a) => a.garderie.statut === StatutGarderie.ACTIVE,
    );
    return actives.find((a) => a.id === preferee) ?? actives[0] ?? null;
  }

  async inscrireGarderie(dto: InscriptionGarderieDto) {
    if (await this.utilisateurs.existsBy({ courriel: dto.courriel }))
      throw new ConflictException(
        'Un compte existe déjà avec ce courriel. Connectez-vous pour continuer.',
      );

    const reglages = parametresEnCache();
    const essai =
      reglages?.dureeEssaiJours && forfait(reglages.forfaitEssai)
        ? forfait(reglages.forfaitEssai)!
        : null;
    const { user, adhesion } = await this.dataSource.transaction(async (m) => {
      const garderie = await m.save(
        m.create(Garderie, {
          nom: dto.nomGarderie.trim(),
          slug: slugifier(dto.nomGarderie),
          adresse: dto.adresse ?? null,
          telephone: dto.telephone ?? null,
          courriel: dto.courriel,
          plan: reglages?.forfaitDefaut ?? 'GRATUIT',
          essaiJusquau: essai ? finEssai(reglages!.dureeEssaiJours) : null,
        }),
      );
      const user = await m.save(
        m.create(Utilisateur, {
          courriel: dto.courriel,
          motDePasseHash: await hacherMotDePasse(dto.motDePasse),
          prenom: dto.prenom.trim(),
          nom: dto.nom.trim(),
          telephone: dto.telephone ?? null,
        }),
      );
      const adhesion = await m.save(
        m.create(Adhesion, {
          utilisateurId: user.id,
          garderieId: garderie.id,
          role: Role.ADMIN,
        }),
      );
      return { user, adhesion };
    });

    await this.audit.consigner(
      { utilisateurId: user.id, garderieId: adhesion.garderieId },
      'garderie.creee',
    );
    await this.mail.envoyer(
      user.courriel,
      'Bienvenue sur Garderie 2027',
      `Bonjour ${user.prenom},\n\nVotre garderie « ${dto.nomGarderie} » a bien été créée. Vous pouvez maintenant inviter votre personnel et inscrire les enfants.${essai ? `\n\nVotre essai ${essai.nom} de ${reglages!.dureeEssaiJours} jours est activé.` : ''}`,
      `${this.mail.frontendUrl}/connexion`,
    );
    return this.emettreJetons(user, adhesion.id);
  }

  async connexion(dto: ConnexionDto) {
    const cle = dto.courriel;
    const e = this.echecs.get(cle);
    if (
      e &&
      Date.now() - e.depuis < FENETRE_ECHECS_MS &&
      e.nombre >= MAX_ECHECS
    )
      throw new ForbiddenException(
        'Trop de tentatives. Réessayez dans 15 minutes.',
      );

    const user = await this.utilisateurs
      .createQueryBuilder('u')
      .addSelect('u.motDePasseHash')
      .where('u.courriel = :c', { c: dto.courriel })
      .getOne();
    if (
      !user ||
      !user.actif ||
      !(await bcrypt.compare(dto.motDePasse, user.motDePasseHash))
    ) {
      const courant =
        e && Date.now() - e.depuis < FENETRE_ECHECS_MS
          ? e
          : { nombre: 0, depuis: Date.now() };
      this.echecs.set(cle, { ...courant, nombre: courant.nombre + 1 });
      throw new UnauthorizedException('Courriel ou mot de passe incorrect.');
    }
    this.echecs.delete(cle);

    const adhesion = await this.adhesionParDefaut(user.id);
    if (!adhesion && !user.estSuperAdmin) {
      const aDesAdhesions = await this.adhesions.existsBy({
        utilisateurId: user.id,
        actif: true,
      });
      throw new ForbiddenException(
        aDesAdhesions
          ? 'Votre garderie est suspendue. Contactez le support.'
          : "Votre compte n'est associé à aucune garderie active.",
      );
    }
    return this.emettreJetons(user, adhesion?.id ?? null);
  }

  async rafraichir(refreshToken: string) {
    let payload: PayloadJwt;
    try {
      payload = await this.jwt.verifyAsync<PayloadJwt>(refreshToken, {
        secret: this.secretRefresh,
      });
    } catch {
      throw new UnauthorizedException(
        'Session expirée, veuillez vous reconnecter.',
      );
    }
    const user = await this.utilisateurs.findOneBy({ id: payload.sub });
    if (
      payload.typ !== 'refresh' ||
      !user ||
      !user.actif ||
      user.versionJeton !== payload.v
    )
      throw new UnauthorizedException(
        'Session expirée, veuillez vous reconnecter.',
      );
    const adhesion = await this.adhesionParDefaut(user.id, payload.adh);
    return this.emettreJetons(user, adhesion?.id ?? null);
  }

  async changerAdhesion(user: UtilisateurConnecte, adhesionId: number) {
    const adhesion = await this.adhesionParDefaut(
      user.utilisateurId,
      adhesionId,
    );
    if (!adhesion || adhesion.id !== adhesionId)
      throw new ForbiddenException('Accès refusé à cette garderie.');
    return this.emettreJetons(
      await this.utilisateurs.findOneByOrFail({ id: user.utilisateurId }),
      adhesion.id,
    );
  }

  async moi(user: UtilisateurConnecte) {
    const u = await this.utilisateurs.findOneByOrFail({
      id: user.utilisateurId,
    });
    const adhesions = await this.adhesions.find({
      where: { utilisateurId: u.id, actif: true },
      relations: { garderie: true },
      order: { id: 'ASC' },
    });
    return {
      id: u.id,
      courriel: u.courriel,
      prenom: u.prenom,
      nom: u.nom,
      telephone: u.telephone,
      estSuperAdmin: u.estSuperAdmin,
      adhesionCourante: user.adhesionId,
      garderieId: user.garderieId,
      role: user.role,
      adhesions: adhesions.map((a) => ({
        id: a.id,
        role: a.role,
        garderie: {
          id: a.garderie.id,
          nom: a.garderie.nom,
          statut: a.garderie.statut,
          fuseauHoraire: a.garderie.fuseauHoraire,
          plan: a.garderie.plan,
          ...resumeForfait(a.garderie),
          essaiJusquau: a.garderie.essaiJusquau,
        },
      })),
    };
  }

  async modifierProfil(user: UtilisateurConnecte, dto: ModifierProfilDto) {
    await this.utilisateurs.update({ id: user.utilisateurId }, dto);
    return this.moi(user);
  }

  async changerMotDePasse(
    user: UtilisateurConnecte,
    dto: ChangerMotDePasseDto,
  ) {
    const u = await this.utilisateurs
      .createQueryBuilder('u')
      .addSelect('u.motDePasseHash')
      .where('u.id = :id', { id: user.utilisateurId })
      .getOneOrFail();
    if (!(await bcrypt.compare(dto.actuel, u.motDePasseHash)))
      throw new BadRequestException('Le mot de passe actuel est incorrect.');
    u.motDePasseHash = await hacherMotDePasse(dto.nouveau);
    u.versionJeton += 1;
    await this.utilisateurs.save(u);
    await this.audit.consigner(user, 'utilisateur.mot_de_passe_modifie');
    return this.emettreJetons(u, user.adhesionId);
  }

  async motDePasseOublie(courriel: string) {
    const user = await this.utilisateurs.findOneBy({ courriel, actif: true });
    if (!user) return;
    const { jeton, hash } = genererJeton();
    await this.utilisateurs.update(
      { id: user.id },
      {
        jetonReinitialisationHash: hash,
        jetonReinitialisationExpireLe: new Date(Date.now() + 60 * 60 * 1000),
      },
    );
    await this.mail.envoyer(
      user.courriel,
      'Réinitialisation de votre mot de passe',
      `Bonjour ${user.prenom},\n\nPour choisir un nouveau mot de passe, cliquez sur le lien ci-dessous (valide 1 heure). Si vous n'êtes pas à l'origine de cette demande, ignorez ce courriel.`,
      `${this.mail.frontendUrl}/reinitialiser-mot-de-passe?jeton=${jeton}`,
    );
  }

  async reinitialiser(dto: ReinitialiserDto) {
    const user = await this.utilisateurs.findOneBy({
      jetonReinitialisationHash: hacherJeton(dto.jeton),
      jetonReinitialisationExpireLe: MoreThan(new Date()),
    });
    if (!user) throw new BadRequestException('Ce lien est invalide ou expiré.');
    await this.utilisateurs.update(
      { id: user.id },
      {
        motDePasseHash: await hacherMotDePasse(dto.motDePasse),
        versionJeton: user.versionJeton + 1,
        jetonReinitialisationHash: null,
        jetonReinitialisationExpireLe: null,
      },
    );
    await this.audit.consigner(
      { utilisateurId: user.id, garderieId: null },
      'utilisateur.mot_de_passe_reinitialise',
    );
  }
}
