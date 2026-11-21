import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { UtilisateurConnecte } from '../common/auth.decorators';
import { StatutGarderie } from '../common/enums';
import { Adhesion, Utilisateur } from '../entities';

export interface PayloadJwt {
  sub: number;
  adh: number | null;
  v: number;
  typ?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(Utilisateur)
    private readonly utilisateurs: Repository<Utilisateur>,
    @InjectRepository(Adhesion)
    private readonly adhesions: Repository<Adhesion>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: PayloadJwt): Promise<UtilisateurConnecte> {
    if (payload.typ || typeof payload.sub !== 'number')
      throw new UnauthorizedException('Jeton invalide.');
    const user = await this.utilisateurs.findOneBy({ id: payload.sub });
    if (!user || !user.actif || user.versionJeton !== payload.v)
      throw new UnauthorizedException(
        'Session expirée, veuillez vous reconnecter.',
      );

    let adhesion: Adhesion | null = null;
    if (payload.adh) {
      adhesion = await this.adhesions.findOne({
        where: { id: payload.adh, utilisateurId: user.id },
        relations: { garderie: true },
      });
      if (!adhesion || !adhesion.actif)
        throw new UnauthorizedException(
          'Votre accès à cette garderie a été retiré.',
        );
      if (
        adhesion.garderie.statut === StatutGarderie.SUSPENDUE &&
        !user.estSuperAdmin
      )
        throw new ForbiddenException(
          'Cette garderie est suspendue. Contactez le support.',
        );
    }
    return {
      utilisateurId: user.id,
      estSuperAdmin: user.estSuperAdmin,
      adhesionId: adhesion?.id ?? null,
      garderieId: adhesion?.garderieId ?? null,
      role: adhesion?.role ?? null,
    };
  }
}
