export type Role = 'ADMIN' | 'GESTIONNAIRE' | 'PARENT'
export type TypeEntree =
  | 'ARRIVEE'
  | 'DEPART'
  | 'REPAS'
  | 'SIESTE'
  | 'ACTIVITE'
  | 'HYGIENE'
  | 'HUMEUR'
  | 'REMARQUE'
  | 'PHOTO'
export type LienParent = 'MERE' | 'PERE' | 'TUTEUR' | 'AUTRE'
export type Presence = 'ABSENT' | 'PRESENT' | 'PARTI'

export interface Jetons {
  accessToken: string
  refreshToken: string
}

export type PlanGarderie = 'GRATUIT' | 'FAMILIAL' | 'PRO' | 'SUR_MESURE'

/** null = illimité */
export interface Limites {
  maxEnfants: number | null
  maxPersonnel: number | null
}

export interface Forfait {
  plan: PlanGarderie
  nom: string
  description: string
  prixMensuel: number
  prixAnnuel: number | null
  prixAPartirDe: boolean
  maxEnfants: number | null
  maxPersonnel: number | null
  fonctionnalites: string[]
  points: string[]
}

export interface Adhesion {
  id: number
  role: Role
  garderie: {
    id: number
    nom: string
    statut: string
    fuseauHoraire: string
    plan: PlanGarderie
    planEffectif: PlanGarderie
    fonctionnalites: string[]
    limites: Limites
    essaiJusquau: string | null
  }
}

export interface Moi {
  id: number
  courriel: string
  prenom: string
  nom: string
  telephone: string | null
  estSuperAdmin: boolean
  adhesionCourante: number | null
  garderieId: number | null
  role: Role | null
  adhesions: Adhesion[]
}

export interface Garderie {
  id: number
  nom: string
  adresse: string | null
  telephone: string | null
  courriel: string | null
  heuresOuverture: string | null
  fuseauHoraire: string
  statut: 'ACTIVE' | 'SUSPENDUE'
  plan: PlanGarderie
  planEffectif: PlanGarderie
  essaiJusquau: string | null
  fonctionnalites: string[]
  limites: Limites
  utilisation: { enfants: number; personnel: number }
  creeLe: string
}

export interface PersonneCourte {
  id: number
  prenom: string
  nom: string
}

export interface Groupe {
  id: number
  nom: string
  trancheAge: string | null
  couleur: string | null
  ageMinMois: number | null
  ageMaxMois: number | null
  description: string | null
  gestionnaires: PersonneCourte[]
  nombreEnfants?: number
}

export interface ContactUrgence {
  id?: number
  nom: string
  telephone: string
  lien: string | null
  autoriseARecuperer: boolean
}

export interface ParentLie extends PersonneCourte {
  courriel: string
  telephone: string | null
  lien: LienParent
}

export interface Enfant {
  id: number
  prenom: string
  nom: string
  dateNaissance: string
  groupeId: number | null
  groupe: Groupe | null
  allergies: string | null
  restrictionsAlimentaires: string | null
  notesMedicales: string | null
  consentementPhoto: boolean
  statut: 'ACTIF' | 'ARCHIVE'
  dateEntree: string | null
  contactsUrgence?: ContactUrgence[]
  parents?: ParentLie[]
}

export interface Photo {
  id: number
  legende: string | null
  date: string
  priseLe: string
  auteurId: number | null
  url: string
  vignetteUrl: string
  enfants?: PersonneCourte[]
}

export interface Entree {
  id: number
  enfantId: number
  date: string
  heure: string
  type: TypeEntree
  donnees: Record<string, string>
  auteur: PersonneCourte | null
  photos: Photo[]
  creeLe: string
  modifieLe: string
}

export interface Resume {
  arrivee: string | null
  depart: string | null
  repas: { id: number; moment: string; quantite: string; menu: string | null }[]
  siesteMinutes: number
  siesteEnCours: boolean
  humeur: string | null
  humeurId: number | null
  nombreHygiene: number
  derniereHygiene: string | null
  nombreActivites: number
  nombrePhotos: number
  nombreRemarques: number
  remarqueImportante: boolean
}

export interface JournalJour {
  date: string
  aujourdhui: string
  presence: Presence
  resume: Resume
  entrees: Entree[]
}

export interface EnfantDuJour {
  id: number
  prenom: string
  nom: string
  dateNaissance: string
  allergies: string | null
  consentementPhoto: boolean
  groupe: { id: number; nom: string; couleur: string | null } | null
  presence: Presence
  resume: Resume
  nombreEntrees: number
  derniereEntree: Pick<Entree, 'id' | 'type' | 'heure' | 'donnees'> | null
  siesteEnCours: { id: number; debut: string } | null
}

export interface Demarrage {
  groupes: number
  personnel: number
  invitationsPersonnel: number
  enfants: number
  parents: number
  invitationsParents: number
}

export interface Reaffectation {
  enfant: PersonneCourte
  ageMois: number
  actuel: { id: number; nom: string } | null
  suggere: { id: number; nom: string }
}

export interface ResultatInvitation {
  statut?: 'lie' | 'invite'
  lienInvitation?: string
}

export interface VueJour {
  date: string
  aujourdhui: string
  enfants: EnfantDuJour[]
}

export interface PagePhotos {
  total: number
  page: number
  pages: number
  photos: Photo[]
}

export interface Invitation {
  id: number
  courriel: string
  prenom: string | null
  nom: string | null
  role?: Role
  lien?: LienParent | null
  expireLe: string
}

export interface MembrePersonnel {
  adhesionId: number
  role: Role
  actif: boolean
  depuis: string
  utilisateur: PersonneCourte & { courriel: string; telephone: string | null }
}

export interface EnfantParent extends Enfant {
  derniereEntree: Entree | null
  nombreEntreesAujourdhui: number
}

export interface GarderieAdmin extends Omit<Garderie, 'utilisation' | 'fonctionnalites'> {
  maxEnfantsPerso: number | null
  maxPersonnelPerso: number | null
  fonctionnalitesPlan: string[]
  fonctionnalitesEffectives: string[]
  fonctionnalitesExtra: string[]
  admins: { nom: string; courriel: string }[]
  statistiques: { enfants: number; personnel: number; parents: number; entrees: number; photos: number }
}
