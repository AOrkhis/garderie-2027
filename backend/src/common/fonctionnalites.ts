import { PlanGarderie } from './enums';
import type { Garderie } from '../entities';

/** Fonctionnalités payantes — le journal (repas, siestes, etc.) reste gratuit. */
export type Fonctionnalite = 'photos';

export const FONCTIONNALITES_PAR_PLAN: Record<PlanGarderie, Fonctionnalite[]> =
  {
    [PlanGarderie.GRATUIT]: [],
    [PlanGarderie.PRO]: ['photos'],
  };

type GarderiePlan = Pick<Garderie, 'plan' | 'essaiJusquau'>;

/** Pendant l'essai, la garderie a le plan Pro. */
export function planEffectif(g: GarderiePlan): PlanGarderie {
  if (g.essaiJusquau && new Date(g.essaiJusquau).getTime() > Date.now())
    return PlanGarderie.PRO;
  return g.plan;
}

export function fonctionnalitesDe(g: GarderiePlan): Fonctionnalite[] {
  return FONCTIONNALITES_PAR_PLAN[planEffectif(g)];
}

export function aFonctionnalite(g: GarderiePlan, f: Fonctionnalite): boolean {
  return fonctionnalitesDe(g).includes(f);
}
