/** Âge en mois révolus entre une date de naissance et une date de référence (AAAA-MM-JJ). */
export function ageEnMois(dateNaissance: string, reference: string): number {
  const [an, mn, jn] = dateNaissance.slice(0, 10).split('-').map(Number);
  const [ar, mr, jr] = reference.slice(0, 10).split('-').map(Number);
  return (ar - an) * 12 + (mr - mn) - (jr < jn ? 1 : 0);
}

interface TrancheAge {
  id: number;
  ageMinMois: number | null;
  ageMaxMois: number | null;
}

/** Groupe dont la tranche d'âge contient l'âge donné (min inclus, max exclu). */
export function groupePourAge<T extends TrancheAge>(
  groupes: T[],
  mois: number,
): T | null {
  return (
    groupes
      .filter((g) => g.ageMinMois != null || g.ageMaxMois != null)
      .filter(
        (g) => mois >= (g.ageMinMois ?? 0) && mois < (g.ageMaxMois ?? Infinity),
      )
      .sort((a, b) => (a.ageMinMois ?? 0) - (b.ageMinMois ?? 0))[0] ?? null
  );
}
