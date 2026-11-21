import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import * as sharp from 'sharp';
import { In, Repository } from 'typeorm';
import { AuditService } from '../common/audit.service';
import { UtilisateurConnecte } from '../common/auth.decorators';
import { dateDuJour } from '../common/dates';
import { aFonctionnalite } from '../common/fonctionnalites';
import { Role, StatutEnfant } from '../common/enums';
import { EnfantsService } from '../enfants/enfants.service';
import { Enfant, Garderie, Photo } from '../entities';

export const TYPES_IMAGE = ['image/jpeg', 'image/png', 'image/webp'];
const PAR_PAGE = 30;

@Injectable()
export class PhotosService {
  private readonly dossier: string;

  constructor(
    config: ConfigService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly enfantsService: EnfantsService,
    @InjectRepository(Photo) private readonly photos: Repository<Photo>,
    @InjectRepository(Enfant) private readonly enfants: Repository<Enfant>,
    @InjectRepository(Garderie)
    private readonly garderies: Repository<Garderie>,
  ) {
    this.dossier = resolve(config.get<string>('UPLOAD_DIR') ?? 'uploads');
  }

  private jetonFichier(photoId: number) {
    return this.jwt.sign({ pid: photoId, typ: 'photo' }, { expiresIn: '2h' });
  }

  serialiser(photo: Photo) {
    const jeton = this.jetonFichier(photo.id);
    return {
      id: photo.id,
      legende: photo.legende,
      date: photo.date,
      priseLe: photo.priseLe,
      auteurId: photo.auteurId,
      url: `/api/photos/${photo.id}/fichier?jeton=${jeton}`,
      vignetteUrl: `/api/photos/${photo.id}/fichier?jeton=${jeton}&taille=vignette`,
      enfants: photo.enfants?.map(({ id, prenom, nom }) => ({
        id,
        prenom,
        nom,
      })),
    };
  }

  async televerser(
    user: UtilisateurConnecte,
    fichiers: Express.Multer.File[],
    enfantIds: number[],
    legende?: string,
  ) {
    if (!fichiers?.length) throw new BadRequestException('Aucune photo reçue.');
    if (!enfantIds.length)
      throw new BadRequestException(
        'Identifiez au moins un enfant sur la photo.',
      );
    const enfants = await this.enfants.findBy({
      id: In(enfantIds),
      garderieId: user.garderieId!,
      statut: StatutEnfant.ACTIF,
    });
    if (enfants.length !== new Set(enfantIds).size)
      throw new BadRequestException('Enfant invalide.');
    const sansConsentement = enfants.filter((e) => !e.consentementPhoto);
    if (sansConsentement.length)
      throw new BadRequestException(
        `Pas de consentement photo pour : ${sansConsentement.map((e) => e.prenom).join(', ')}.`,
      );

    const garderie = await this.garderies.findOneByOrFail({
      id: user.garderieId!,
    });
    if (!aFonctionnalite(garderie, 'photos'))
      throw new HttpException(
        {
          code: 'FONCTIONNALITE_PAYANTE',
          fonctionnalite: 'photos',
          message:
            'La publication de photos nécessite le forfait Familial, Pro ou Sur mesure. Contactez-nous pour changer de forfait.',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );

    const creees: Photo[] = [];
    for (const f of fichiers) {
      const base = `${garderie.id}/${randomUUID()}`;
      let contenu: Buffer;
      let vignette: Buffer;
      try {
        const image = sharp(f.buffer).rotate();
        [contenu, vignette] = await Promise.all([
          image
            .clone()
            .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 82 })
            .toBuffer(),
          image
            .clone()
            .resize(480, 480, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 75 })
            .toBuffer(),
        ]);
      } catch {
        throw new BadRequestException(
          `Le fichier « ${f.originalname} » n'est pas une image valide.`,
        );
      }
      creees.push(
        await this.photos.save(
          this.photos.create({
            garderieId: garderie.id,
            auteurId: user.utilisateurId,
            cleStockage: `${base}.jpg`,
            cleVignette: `${base}_v.jpg`,
            contenu,
            vignette,
            legende: legende?.trim() || null,
            date: dateDuJour(garderie.fuseauHoraire),
            enfants,
          }),
        ),
      );
    }
    await this.audit.consigner(user, 'photos.televersees', undefined, {
      nombre: creees.length,
      enfantIds,
    });
    return creees.map((p) => this.serialiser(p));
  }

  async listerPourEnfant(
    user: UtilisateurConnecte,
    enfantId: number,
    page = 1,
    date?: string,
  ) {
    await this.enfantsService.verifierAcces(user, enfantId);
    const qb = this.photos
      .createQueryBuilder('p')
      .innerJoin('p.enfants', 'cible', 'cible.id = :enfantId', { enfantId })
      .leftJoinAndSelect('p.enfants', 'e')
      .where('p.garderieId = :g', { g: user.garderieId });
    if (date) qb.andWhere('p.date = :date', { date });
    const [photos, total] = await qb
      .orderBy('p.priseLe', 'DESC')
      .skip((page - 1) * PAR_PAGE)
      .take(PAR_PAGE)
      .getManyAndCount();
    return {
      total,
      page,
      pages: Math.max(1, Math.ceil(total / PAR_PAGE)),
      photos: photos.map((p) => this.serialiserPour(user, p, enfantId)),
    };
  }

  /** Un parent ne voit que ses enfants identifiés sur la photo. */
  private serialiserPour(
    user: UtilisateurConnecte,
    photo: Photo,
    enfantId: number,
  ) {
    const s = this.serialiser(photo);
    return user.role === Role.PARENT
      ? { ...s, enfants: s.enfants?.filter((e) => e.id === enfantId) }
      : s;
  }

  async listerRecentes(user: UtilisateurConnecte, page = 1) {
    const [photos, total] = await this.photos.findAndCount({
      where: { garderieId: user.garderieId! },
      relations: { enfants: true },
      order: { priseLe: 'DESC' },
      skip: (page - 1) * PAR_PAGE,
      take: PAR_PAGE,
    });
    return {
      total,
      page,
      pages: Math.max(1, Math.ceil(total / PAR_PAGE)),
      photos: photos.map((p) => this.serialiser(p)),
    };
  }

  async verifierPhotos(
    user: UtilisateurConnecte,
    ids: number[],
  ): Promise<Photo[]> {
    if (!ids.length) return [];
    const photos = await this.photos.findBy({
      id: In(ids),
      garderieId: user.garderieId!,
    });
    if (photos.length !== new Set(ids).size)
      throw new BadRequestException('Photo invalide.');
    return photos;
  }

  async fichierPhoto(
    id: number,
    jeton: string,
    taille?: string,
  ): Promise<{ buffer?: Buffer; chemin?: string }> {
    try {
      const p = await this.jwt.verifyAsync<{ pid: number; typ: string }>(jeton);
      if (p.typ !== 'photo' || p.pid !== id) throw new Error();
    } catch {
      throw new ForbiddenException('Lien de photo expiré.');
    }
    const photo = await this.photos
      .createQueryBuilder('p')
      .addSelect('p.contenu')
      .addSelect('p.vignette')
      .where('p.id = :id', { id })
      .getOne();
    if (!photo) throw new NotFoundException('Photo introuvable.');
    const donnees =
      taille === 'vignette' ? (photo.vignette ?? photo.contenu) : photo.contenu;
    if (donnees) return { buffer: donnees as Buffer };
    // Ancienne photo stockée sur disque (avant le stockage en BD).
    return {
      chemin: join(
        this.dossier,
        taille === 'vignette' ? photo.cleVignette : photo.cleStockage,
      ),
    };
  }

  async supprimer(user: UtilisateurConnecte, id: number) {
    const photo = await this.photos.findOneBy({
      id,
      garderieId: user.garderieId!,
    });
    if (!photo) throw new NotFoundException('Photo introuvable.');
    if (user.role !== Role.ADMIN && photo.auteurId !== user.utilisateurId)
      throw new ForbiddenException(
        "Seul l'auteur ou un administrateur peut supprimer cette photo.",
      );
    await this.photos.remove(photo);
    await Promise.all(
      [photo.cleStockage, photo.cleVignette].map((k) =>
        fs.rm(join(this.dossier, k), { force: true }),
      ),
    );
    await this.audit.consigner(user, 'photo.supprimee', `photo:${id}`);
  }
}
