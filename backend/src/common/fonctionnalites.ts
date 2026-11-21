import { HttpException, HttpStatus } from '@nestjs/common';
import type { Forfait, Garderie, ParametresPlateforme } from '../entities';

/**
 * Fonctionnalités payantes : chacune correspond à du code qui la contrôle
 * (ex. `photos` → téléversement). Les forfaits qui les incluent sont gérés en base.
 */
export type Fonctionnalite = 'photos';

export const FONCTIONNALITES: { cle: Fonctionnalite; libelle: string }[] = [
  { cle: 'photos', libelle: 'Partage de photos' },
];
export const CLES_FONCTIONNALITES = FONCTIONNALITES.map((f) => f.cle);

/** Forfaits créés au premier démarrage — ensuite modifiables par le super admin. */
export const FORFAITS_INITIAUX: Partial<Forfait>[] = [
  {
    code: 'GRATUIT',
    nom: 'Gratuit',
    description: 'Pour essayer le journal avec un petit groupe.',
    prixMensuel: 0,
    prixAnnuel: null,
    maxEnfants: 5,
    maxPersonnel: 2,
    fonctionnalites: [],
    points: [
      "Jusqu'à 5 enfants",
      '2 comptes du personnel',
      'Présences, repas, siestes, changes, humeurs',
      'Parents illimités',
    ],
    ordre: 0,
    libelleBouton: 'Commencer',
  },
  {
    code: 'FAMILIAL',
    nom: 'Familial',
    description: 'Pour les services de garde en milieu familial (RSG).',
    prixMensuel: 19,
    prixAnnuel: 190,
    maxEnfants: 9,
    maxPersonnel: 3,
    fonctionnalites: ['photos'],
    points: [
      "Jusqu'à 9 enfants",
      '3 comptes (RSG + assistante)',
      'Tout le journal',
      'Partage de photos privées',
    ],
    ordre: 1,
  },
  {
    code: 'PRO',
    nom: 'Pro',
    description: 'Pour les garderies et les installations.',
    prixMensuel: 79,
    prixAnnuel: 790,
    maxEnfants: 50,
    maxPersonnel: null,
    fonctionnalites: ['photos'],
    points: [
      "Jusqu'à 50 enfants",
      'Personnel illimité',
      'Partage de photos privées',
      'Soutien prioritaire par courriel',
    ],
    ordre: 2,
    vedette: true,
    etiquetteVedette: 'Le plus populaire',
  },
  {
    code: 'SUR_MESURE',
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
    ordre: 3,
    libelleBouton: 'Nous contacter',
  },
];

export const PARAMETRES_INITIAUX: Partial<ParametresPlateforme> = {
  id: 1,
  forfaitDefaut: 'GRATUIT',
  forfaitEssai: 'PRO',
  dureeEssaiJours: 7,
  mentionTaxes: 'Prix en dollars canadiens, avant TPS et TVQ.',
};

// ---------- Cache mémoire (rechargé par ForfaitsService à chaque modification) ----------

let forfaits = new Map<string, Forfait>();
let parametres: ParametresPlateforme | null = null;

export function definirCacheForfaits(
  liste: Forfait[],
  p: ParametresPlateforme | null,
) {
  forfaits = new Map(liste.map((f) => [f.code, f]));
  parametres = p;
}
export const forfaitsEnCache = () =>
  [...forfaits.values()].sort((a, b) => a.ordre - b.ordre);
export const parametresEnCache = () => parametres;
export const forfait = (code: string | null | undefined) =>
  code ? forfaits.get(code) : undefined;
export const nomForfait = (code: string | null | undefined) =>
  forfait(code)?.nom ?? code ?? '—';

type GarderiePlan = Pick<Garderie, 'plan' | 'essaiJusquau'> & {
  fonctionnalitesExtra?: string[] | null;
  maxEnfantsPerso?: number | null;
  maxPersonnelPerso?: number | null;
};

export const essaiActif = (g: GarderiePlan) =>
  !!g.essaiJusquau && new Date(g.essaiJusquau).getTime() > Date.now();

/** Pendant l'essai, la garderie profite du forfait d'essai s'il est supérieur au sien. */
export function planEffectif(g: GarderiePlan): string {
  const essai = forfait(parametres?.forfaitEssai);
  const base = forfait(g.plan);
  if (essai && essaiActif(g) && (!base || essai.ordre > base.ordre))
    return essai.code;
  return g.plan;
}

/** Fonctionnalités du plan + celles accordées individuellement. */
export function fonctionnalitesDe(g: GarderiePlan): Fonctionnalite[] {
  const base = new Set(fonctionnalitesDuPlan(g));
  for (const f of g.fonctionnalitesExtra ?? []) base.add(f as Fonctionnalite);
  return [...base];
}

/** Celles incluses par le plan seul (sans les extras — ne peuvent pas être retirées). */
export function fonctionnalitesDuPlan(g: GarderiePlan): Fonctionnalite[] {
  return (forfait(planEffectif(g))?.fonctionnalites ?? []) as Fonctionnalite[];
}

export function aFonctionnalite(g: GarderiePlan, f: Fonctionnalite): boolean {
  return fonctionnalitesDe(g).includes(f);
}

/** Limites effectives : la valeur fixée par le super admin l'emporte sur le forfait. */
export function limitesDe(g: GarderiePlan) {
  const f = forfait(planEffectif(g));
  return {
    maxEnfants: g.maxEnfantsPerso ?? f?.maxEnfants ?? null,
    maxPersonnel: g.maxPersonnelPerso ?? f?.maxPersonnel ?? null,
  };
}

/** Tout ce que l'interface doit savoir du forfait d'une garderie. */
export function resumeForfait(g: GarderiePlan) {
  const effectif = planEffectif(g);
  return {
    planNom: nomForfait(g.plan),
    planEffectif: effectif,
    planEffectifNom: nomForfait(effectif),
    fonctionnalites: fonctionnalitesDe(g),
    limites: limitesDe(g),
  };
}

/** Noms des forfaits publics qui incluent une fonctionnalité (« Familial, Pro »). */
export const forfaitsAvec = (f: Fonctionnalite) =>
  forfaitsEnCache()
    .filter((x) => x.public && x.fonctionnalites?.includes(f))
    .map((x) => x.nom);

/** Lève une 402 si l'ajout dépasse la limite du forfait. */
export function verifierLimite(
  g: GarderiePlan,
  type: 'enfants' | 'personnel',
  utilises: number,
) {
  const { maxEnfants, maxPersonnel } = limitesDe(g);
  const max = type === 'enfants' ? maxEnfants : maxPersonnel;
  if (max === null || utilises < max) return;
  const nom = nomForfait(planEffectif(g));
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
