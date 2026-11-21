import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api, apiBlob, jetons } from '@/api/client'
import type { Jetons, Moi } from '@/api/types'

export const useAuthStore = defineStore('auth', () => {
  const moi = ref<Moi | null>(null)
  const charge = ref(false)

  const connecte = computed(() => !!moi.value)
  const role = computed(() => moi.value?.role ?? null)
  const estPersonnel = computed(() => role.value === 'ADMIN' || role.value === 'GESTIONNAIRE')
  const estAdmin = computed(() => role.value === 'ADMIN')
  const estParent = computed(() => role.value === 'PARENT')
  const adhesionCourante = computed(() =>
    moi.value?.adhesions.find((a) => a.id === moi.value?.adhesionCourante),
  )
  const planEffectif = computed(() => adhesionCourante.value?.garderie.planEffectif ?? null)
  const enEssai = computed(() => {
    const e = adhesionCourante.value?.garderie.essaiJusquau
    return !!e && new Date(e).getTime() > Date.now()
  })
  /** Uniquement pour les fonctionnalités payantes (ex. 'photos'). */
  const aFonctionnalite = (f: string) =>
    (adhesionCourante.value?.garderie.fonctionnalites ?? []).includes(f)

  /** Logo de la garderie courante (URL d'objet local), chargé à la demande. */
  const logoGarderie = ref<string | null>(null)
  let logoChargePour: string | null = null
  async function chargerLogoGarderie(forcer = false) {
    const g = adhesionCourante.value?.garderie
    if (!g?.aLogo || !g.id) {
      logoGarderie.value = null
      logoChargePour = null
      return
    }
    if (!forcer && logoChargePour === String(g.id)) return
    logoChargePour = String(g.id)
    try {
      const blob = await apiBlob('/garderie/logo')
      if (logoGarderie.value) URL.revokeObjectURL(logoGarderie.value)
      logoGarderie.value = URL.createObjectURL(blob)
    } catch {
      logoGarderie.value = null
    }
  }

  const accueil = computed(() => {
    if (estParent.value) return '/parent'
    if (estPersonnel.value) return '/garderie/aujourd-hui'
    if (moi.value?.estSuperAdmin) return '/admin/garderies'
    return '/connexion'
  })

  async function chargerMoi() {
    if (!jetons.lire()) {
      moi.value = null
    } else {
      try {
        moi.value = await api<Moi>('/auth/moi')
        void chargerLogoGarderie()
      } catch {
        moi.value = null
      }
    }
    charge.value = true
  }

  async function ouvrirSession(j: Jetons) {
    jetons.ecrire(j)
    await chargerMoi()
  }

  async function connexion(courriel: string, motDePasse: string) {
    await ouvrirSession(
      await api<Jetons>('/auth/connexion', {
        method: 'POST',
        body: { courriel, motDePasse },
        auth: false,
      }),
    )
  }

  async function changerAdhesion(adhesionId: number) {
    await ouvrirSession(
      await api<Jetons>('/auth/changer-adhesion', { method: 'POST', body: { adhesionId } }),
    )
  }

  function deconnexion() {
    jetons.ecrire(null)
    moi.value = null
  }

  return {
    moi,
    charge,
    connecte,
    role,
    estPersonnel,
    estAdmin,
    estParent,
    adhesionCourante,
    planEffectif,
    enEssai,
    aFonctionnalite,
    logoGarderie,
    chargerLogoGarderie,
    accueil,
    chargerMoi,
    ouvrirSession,
    connexion,
    changerAdhesion,
    deconnexion,
  }
})
