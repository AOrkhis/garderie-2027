import { PlanGarderie } from './enums';
import type { Garderie } from '../entities';

/** Fonctionnalités payantes — le journal (repas, siestes, etc.) reste gratuit. */
export type Fonctionnalite = 'photos';

/** Registre affiché dans la console super admin (cases à cocher). */
export const FONCTIONNALITES: { cle: Fonctionnalite; libelle: string }[] = [
  { cle: 'photos', libelle: 'Partage de photos' },
];

export const FONCTIONNALITES_PAR_PLAN: Record<PlanGarderie, Fonctionnalite[]> =
  {
    [PlanGarderie.GRATUIT]: [],
    [PlanGarderie.PRO]: ['photos'],
  };

type GarderiePlan = Pick<Garderie, 'plan' | 'essaiJusquau'> & {
  fonctionnalitesExtra?: string[] | null;
};

/** Pendant l'essai, la garderie a le plan Pro. */
export function planEffectif(g: GarderiePlan): PlanGarderie {
  if (g.essaiJusquau && new Date(g.essaiJusquau).getTime() > Date.now())
    return PlanGarderie.PRO;
  return g.plan;
}

/** Fonctionnalités du plan + celles accordées individuellement. */
export function fonctionnalitesDe(g: GarderiePlan): Fonctionnalite[] {
  const base = new Set(FONCTIONNALITES_PAR_PLAN[planEffectif(g)]);
  for (const f of g.fonctionnalitesExtra ?? []) base.add(f as Fonctionnalite);
  return [...base];
}

/** Celles incluses par le plan seul (sans les extras — ne peuvent pas être retirées). */
export function fonctionnalitesDuPlan(g: GarderiePlan): Fonctionnalite[] {
  return FONCTIONNALITES_PAR_PLAN[planEffectif(g)];
}

export function aFonctionnalite(g: GarderiePlan, f: Fonctionnalite): boolean {
  return fonctionnalitesDe(g).includes(f);
}
