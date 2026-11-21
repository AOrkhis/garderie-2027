import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api/client'
import type { Forfait, GrilleForfaits } from '@/api/types'

/** Grille tarifaire publique, chargée une fois et partagée. */
export const useForfaitsStore = defineStore('forfaits', () => {
  const forfaits = ref<Forfait[]>([])
  const parametres = ref<GrilleForfaits['parametres'] | null>(null)
  let chargement: Promise<void> | null = null

  function charger(forcer = false) {
    if (!chargement || forcer)
      chargement = api<GrilleForfaits>('/forfaits')
        .then((r) => {
          forfaits.value = r.forfaits
          parametres.value = r.parametres
        })
        .catch(() => {
          chargement = null
        })
    return chargement
  }

  /** Premier forfait public (dans l'ordre d'affichage) qui inclut une fonctionnalité. */
  const pour = (f: string) => forfaits.value.find((x) => x.public && x.fonctionnalites?.includes(f)) ?? null
  const nomsAvec = (f: string) => forfaits.value.filter((x) => x.public && x.fonctionnalites?.includes(f)).map((x) => x.nom)

  return { forfaits, parametres, charger, pour, nomsAvec }
})
