export enum Role {
  ADMIN = 'ADMIN',
  GESTIONNAIRE = 'GESTIONNAIRE',
  PARENT = 'PARENT',
}

export enum StatutGarderie {
  ACTIVE = 'ACTIVE',
  SUSPENDUE = 'SUSPENDUE',
}

export enum PlanGarderie {
  GRATUIT = 'GRATUIT',
  PRO = 'PRO',
}

export enum StatutEnfant {
  ACTIF = 'ACTIF',
  ARCHIVE = 'ARCHIVE',
}

export enum LienParent {
  MERE = 'MERE',
  PERE = 'PERE',
  TUTEUR = 'TUTEUR',
  AUTRE = 'AUTRE',
}

export enum TypeEntree {
  ARRIVEE = 'ARRIVEE',
  DEPART = 'DEPART',
  REPAS = 'REPAS',
  SIESTE = 'SIESTE',
  ACTIVITE = 'ACTIVITE',
  HYGIENE = 'HYGIENE',
  HUMEUR = 'HUMEUR',
  REMARQUE = 'REMARQUE',
  PHOTO = 'PHOTO',
}

export const ROLES_PERSONNEL = [Role.ADMIN, Role.GESTIONNAIRE];
