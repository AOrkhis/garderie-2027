import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import {
  PUBLIC_KEY,
  ROLES_KEY,
  SUPER_ADMIN_KEY,
  UtilisateurConnecte,
} from '../common/auth.decorators';
import { Role } from '../common/enums';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(ctx: ExecutionContext) {
    const estPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    return estPublic ? true : super.canActivate(ctx);
  }

  handleRequest<T>(err: unknown, user: T): T {
    if (err || !user)
      throw err instanceof Error
        ? err
        : new UnauthorizedException('Veuillez vous connecter.');
    return user;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const cibles = [ctx.getHandler(), ctx.getClass()];
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, cibles);
    const superAdmin = this.reflector.getAllAndOverride<boolean>(
      SUPER_ADMIN_KEY,
      cibles,
    );
    const user: UtilisateurConnecte | undefined = ctx
      .switchToHttp()
      .getRequest().user;
    if (superAdmin && !user?.estSuperAdmin)
      throw new ForbiddenException('Accès réservé aux super administrateurs.');
    if (
      roles?.length &&
      (!user?.role || !user.garderieId || !roles.includes(user.role))
    )
      throw new ForbiddenException(
        "Vous n'avez pas les droits nécessaires pour cette action.",
      );
    return true;
  }
}
