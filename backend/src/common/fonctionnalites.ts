import { HttpException, HttpStatus } from '@nestjs/common';
import { PlanGarderie } from './enums';
import type { Garderie } from '../entities';

/** Fonctionnalités payantes — le journal (repas, siestes, etc.) reste gratuit. */
export type Fonctionnalite = 'photos';

/** Registre affiché dans la console super admin (cases à cocher). */
export const FONCTIONNALITES: { cle: Fonctionnalite; libelle: string }[] = [
  { cle: 'photos', libelle: 'Partage de photos' },
];

export interface Forfait {
  plan: PlanGarderie;
  nom: string;
  description: string;
  /** Prix en dollars canadiens, avant taxes (TPS + TVQ). */
  prixMensuel: number;
  prixAnnuel: number | null;
  /** « À partir de » : prix de base d'un forfait négocié. */
  prixAPartirDe: boolean;
  /** null = illimité (ou fixé au cas par cas pour le forfait sur mesure). */
  maxEnfants: number | null;
  maxPersonnel: number | null;
  fonctionnalites: Fonctionnalite[];
  points: string[];
}

/** Source unique des forfaits : prix, limites et fonctionnalités. */
export const FORFAITS: Record<PlanGarderie, Forfait> = {
  [PlanGarderie.GRATUIT]: {
    plan: PlanGarderie.GRATUIT,
    nom: 'Gratuit',
    description: 'Pour essayer le journal avec un petit groupe.',
    prixMensuel: 0,
    prixAnnuel: null,
    prixAPartirDe: false,
    maxEnfants: 5,
    maxPersonnel: 2,
    fonctionnalites: [],
    points: [
      "Jusqu'à 5 enfants",
      '2 comptes du personnel',
      'Présences, repas, siestes, changes, humeurs',
      'Parents illimités',
    ],
  },
  [PlanGarderie.FAMILIAL]: {
    plan: PlanGarderie.FAMILIAL,
    nom: 'Familial',
    description: 'Pour les services de garde en milieu familial (RSG).',
    prixMensuel: 19,
    prixAnnuel: 190,
    prixAPartirDe: false,
    maxEnfants: 9,
    maxPersonnel: 3,
    fonctionnalites: ['photos'],
    points: [
      "Jusqu'à 9 enfants",
      '3 comptes (RSG + assistante)',
      'Tout le journal',
      'Partage de photos privées',
    ],
  },
  [PlanGarderie.PRO]: {
    plan: PlanGarderie.PRO,
    nom: 'Pro',
    description: 'Pour les garderies et les installations.',
    prixMensuel: 79,
    prixAnnuel: 790,
    prixAPartirDe: false,
    maxEnfants: 50,
    maxPersonnel: null,
    fonctionnalites: ['photos'],
    points: [
      "Jusqu'à 50 enfants",
      'Personnel illimité',
      'Partage de photos privées',
      'Soutien prioritaire par courriel',
    ],
  },
  [PlanGarderie.SUR_MESURE]: {
    plan: PlanGarderie.SUR_MESURE,
    nom: 'Sur mesure',
    description: 'Grandes installations et réseaux de garderies.',
    prixMensuel: 149,
    prixAnnuel: null,
    prixAPartirDe: true,
    maxEnfants: null,
    maxPersonnel: null,
    fonctionnalites: ['photos'],
    points: [
      'Plus de 50 enfants (1,50 $ par enfant au-delà)',
      'Plusieurs installations',
      'Personnel illimité',
      'Accompagnement et soutien téléphonique',
    ],
  },
};

/** Ordre d'affichage. */
export const ORDRE_FORFAITS = [
  PlanGarderie.GRATUIT,
  PlanGarderie.FAMILIAL,
  PlanGarderie.PRO,
  PlanGarderie.SUR_MESURE,
];

type GarderiePlan = Pick<Garderie, 'plan' | 'essaiJusquau'> & {
  fonctionnalitesExtra?: string[] | null;
  maxEnfantsPerso?: number | null;
  maxPersonnelPerso?: number | null;
};

export const essaiActif = (g: GarderiePlan) =>
  !!g.essaiJusquau && new Date(g.essaiJusquau).getTime() > Date.now();

/** Pendant l'essai, une garderie Gratuit ou Familial profite du forfait Pro. */
export function planEffectif(g: GarderiePlan): PlanGarderie {
  if (
    essaiActif(g) &&
    (g.plan === PlanGarderie.GRATUIT || g.plan === PlanGarderie.FAMILIAL)
  )
    return PlanGarderie.PRO;
  return g.plan;
}

/** Fonctionnalités du plan + celles accordées individuellement. */
export function fonctionnalitesDe(g: GarderiePlan): Fonctionnalite[] {
  const base = new Set(FORFAITS[planEffectif(g)].fonctionnalites);
  for (const f of g.fonctionnalitesExtra ?? []) base.add(f as Fonctionnalite);
  return [...base];
}

/** Celles incluses par le plan seul (sans les extras — ne peuvent pas être retirées). */
export function fonctionnalitesDuPlan(g: GarderiePlan): Fonctionnalite[] {
  return FORFAITS[planEffectif(g)].fonctionnalites;
}

export function aFonctionnalite(g: GarderiePlan, f: Fonctionnalite): boolean {
  return fonctionnalitesDe(g).includes(f);
}

/** Limites effectives : la valeur fixée par le super admin l'emporte sur le forfait. */
export function limitesDe(g: GarderiePlan) {
  const f = FORFAITS[planEffectif(g)];
  return {
    maxEnfants: g.maxEnfantsPerso ?? f.maxEnfants,
    maxPersonnel: g.maxPersonnelPerso ?? f.maxPersonnel,
  };
}

/** Lève une 402 si l'ajout dépasse la limite du forfait. */
export function verifierLimite(
  g: GarderiePlan,
  type: 'enfants' | 'personnel',
  utilises: number,
) {
  const { maxEnfants, maxPersonnel } = limitesDe(g);
  const max = type === 'enfants' ? maxEnfants : maxPersonnel;
  if (max === null || utilises < max) return;
  const nom = FORFAITS[planEffectif(g)].nom;
  throw new HttpException(
    {
      statusCode: HttpStatus.PAYMENT_REQUIRED,
      code: 'LIMITE_ATTEINTE',
      limite: type,
      max,
      message:
        type === 'enfants'
          ? `Limite de ${max} enfants actifs atteinte pour le forfait ${nom}. Archivez un enfant ou passez à un forfait supérieur.`
          : `Limite de ${max} comptes du personnel atteinte pour le forfait ${nom} (invitations en attente comprises). Passez à un forfait supérieur.`,
    },
    HttpStatus.PAYMENT_REQUIRED,
  );
}
