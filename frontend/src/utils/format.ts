import type { LienParent, Presence, Role, TypeEntree } from '@/api/types'

const enDate = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`)

export const formaterDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    enDate(iso),
  )

export const formaterDateLongue = (iso: string) => {
  const s = new Intl.DateTimeFormat('fr-CA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(enDate(iso))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const formaterHeure = (hhmm: string | null | undefined) =>
  hhmm ? `${Number(hhmm.slice(0, 2))} h ${hhmm.slice(3, 5)}` : '—'

export const formaterDuree = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
}

export function decalerDate(iso: string, jours: number) {
  const d = enDate(iso)
  d.setDate(d.getDate() + jours)
  return d.toLocaleDateString('en-CA')
}

export function age(dateNaissance: string) {
  const n = enDate(dateNaissance)
  const a = new Date()
  let mois = (a.getFullYear() - n.getFullYear()) * 12 + a.getMonth() - n.getMonth()
  if (a.getDate() < n.getDate()) mois--
  if (mois < 24) return `${mois} mois`
  const ans = Math.floor(mois / 12)
  return `${ans} an${ans > 1 ? 's' : ''}`
}

/** Date du jour locale (AAAA-MM-JJ) — toISOString() donnerait la date UTC, parfois le lendemain. */
export const aujourdhuiLocal = () => new Date().toLocaleDateString('en-CA')

/** Âge en mois révolus (même calcul que le serveur). */
export function ageEnMois(dateNaissance: string, reference = aujourdhuiLocal()) {
  const [an, mn, jn] = dateNaissance.slice(0, 10).split('-').map(Number) as [number, number, number]
  const [ar, mr, jr] = reference.slice(0, 10).split('-').map(Number) as [number, number, number]
  return (ar - an) * 12 + (mr - mn) - (jr < jn ? 1 : 0)
}

export function formaterMois(mois: number) {
  if (mois < 24) return `${mois} mois`
  const ans = Math.floor(mois / 12)
  const reste = mois % 12
  return reste ? `${ans} ans ${reste} mois` : `${ans} ans`
}

/** Texte de la tranche d'âge d'un groupe, ex. « 18 mois à 2 ans ». */
export function formaterTranche(g: { ageMinMois: number | null; ageMaxMois: number | null; trancheAge?: string | null }) {
  if (g.ageMinMois == null && g.ageMaxMois == null) return g.trancheAge || ''
  if (g.ageMaxMois == null) return `${formaterMois(g.ageMinMois ?? 0)} et plus`
  return `${g.ageMinMois ? formaterMois(g.ageMinMois) : '0'} à ${formaterMois(g.ageMaxMois)}`
}

/** Groupe correspondant à l'âge (âge min inclus, âge max exclu). */
export function groupePourAge<T extends { ageMinMois: number | null; ageMaxMois: number | null }>(groupes: T[], mois: number) {
  return (
    groupes
      .filter((g) => (g.ageMinMois != null || g.ageMaxMois != null) && mois >= (g.ageMinMois ?? 0) && mois < (g.ageMaxMois ?? Infinity))
      .sort((a, b) => (a.ageMinMois ?? 0) - (b.ageMinMois ?? 0))[0] ?? null
  )
}

export const initiales = (p: { prenom: string; nom: string }) =>
  `${p.prenom.charAt(0)}${p.nom.charAt(0)}`.toUpperCase()

export const ROLES: Record<Role, string> = {
  ADMIN: 'Administrateur',
  GESTIONNAIRE: 'Gestionnaire',
  PARENT: 'Parent',
}

/** « 79 $ », « 1 490 $ » */
export const formaterPrix = (n: number) => `${new Intl.NumberFormat('fr-CA').format(n)} $`

export const LIENS: Record<LienParent, string> = {
  MERE: 'Mère',
  PERE: 'Père',
  TUTEUR: 'Tuteur / tutrice',
  AUTRE: 'Autre',
}

export const PRESENCES: Record<Presence, string> = {
  ABSENT: 'Pas encore arrivé',
  PRESENT: 'Présent',
  PARTI: 'Parti',
}

export const TYPES: Record<TypeEntree, string> = {
  ARRIVEE: 'Arrivée',
  DEPART: 'Départ',
  REPAS: 'Repas',
  SIESTE: 'Sieste',
  ACTIVITE: 'Activité',
  HYGIENE: 'Hygiène',
  HUMEUR: 'Humeur',
  REMARQUE: 'Remarque',
  PHOTO: 'Photo',
}

export const MOMENTS: Record<string, string> = {
  DEJEUNER: 'Déjeuner',
  COLLATION_AM: 'Collation du matin',
  DINER: 'Dîner',
  COLLATION_PM: "Collation de l'après-midi",
  SOUPER: 'Souper',
}

export const QUANTITES: Record<string, string> = {
  TOUT: 'Tout mangé',
  BIEN: 'Bien mangé',
  UN_PEU: 'Un peu',
  RIEN: 'Rien mangé',
}

export const QUALITES_SIESTE: Record<string, string> = {
  BIEN: 'Bien dormi',
  AGITE: 'Sommeil agité',
  PAS_DORMI: "N'a pas dormi",
}

export const CATEGORIES: Record<string, string> = {
  MOTRICITE: 'Motricité',
  ART: 'Art et bricolage',
  MUSIQUE: 'Musique',
  PLEIN_AIR: 'Plein air',
  LANGAGE: 'Langage',
  LECTURE: 'Lecture',
  JEU_LIBRE: 'Jeu libre',
  SCIENCE: 'Découverte et science',
  AUTRE: 'Autre',
}

export const HYGIENE_GENRES: Record<string, string> = { COUCHE: 'Couche', TOILETTE: 'Toilette' }
export const HYGIENE_DETAILS: Record<string, string> = {
  MOUILLEE: 'Mouillée',
  SELLE: 'Selle',
  SECHE: 'Sèche',
}

export const HUMEURS: Record<string, string> = {
  JOYEUX: 'Joyeux',
  CALME: 'Calme',
  FATIGUE: 'Fatigué',
  TRISTE: 'Triste',
  AGITE: 'Agité',
}

/** Texte résumé d'une entrée, pour la chronologie. */
export function decrireEntree(type: TypeEntree, d: Record<string, string>): string {
  switch (type) {
    case 'ARRIVEE':
    case 'DEPART':
      return [d.parQui && `Avec ${d.parQui}`, d.remarque].filter(Boolean).join(' — ')
    case 'REPAS':
      return [MOMENTS[d.moment!], d.menu, QUANTITES[d.quantite!], d.commentaire]
        .filter(Boolean)
        .join(' · ')
    case 'SIESTE':
      return [
        `${formaterHeure(d.debut)} → ${d.fin ? formaterHeure(d.fin) : 'en cours'}`,
        d.qualite && QUALITES_SIESTE[d.qualite],
        d.commentaire,
      ]
        .filter(Boolean)
        .join(' · ')
    case 'ACTIVITE':
      return [d.titre, d.categorie && CATEGORIES[d.categorie], d.description]
        .filter(Boolean)
        .join(' · ')
    case 'HYGIENE':
      return [HYGIENE_GENRES[d.genre!], d.detail && HYGIENE_DETAILS[d.detail], d.remarque]
        .filter(Boolean)
        .join(' · ')
    case 'HUMEUR':
      return [d.humeur && HUMEURS[d.humeur], d.commentaire]
        .filter(Boolean)
        .join(' · ')
    case 'REMARQUE':
      return d.texte ?? ''
    case 'PHOTO':
      return d.legende ?? ''
  }
}
