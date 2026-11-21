import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Role } from './enums';

export interface UtilisateurConnecte {
  utilisateurId: number;
  estSuperAdmin: boolean;
  adhesionId: number | null;
  garderieId: number | null;
  role: Role | null;
}

export const PUBLIC_KEY = 'public';
export const Public = () => SetMetadata(PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const SUPER_ADMIN_KEY = 'superAdmin';
export const SuperAdmin = () => SetMetadata(SUPER_ADMIN_KEY, true);

export const Utilisateur = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UtilisateurConnecte =>
    ctx.switchToHttp().getRequest().user,
);
