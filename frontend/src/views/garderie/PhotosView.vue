<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { Enfant, PagePhotos, Photo } from '@/api/types'
import FormulaireEntree from '@/components/FormulaireEntree.vue'
import GaleriePhotos from '@/components/GaleriePhotos.vue'
import { useAuthStore } from '@/stores/auth'
import { useForfaitsStore } from '@/stores/forfaits'
import { useNotificationsStore } from '@/stores/notifications'

const auth = useAuthStore()
const forfaitsStore = useForfaitsStore()
const notif = useNotificationsStore()
const enfants = ref<Enfant[]>([])
const page = ref<PagePhotos | null>(null)
const formulaire = ref(false)

async function chargerPhotos(p = 1) {
  page.value = await api<PagePhotos>(`/photos?page=${p}`).catch((e) => (notif.erreur(e), null))
}

onMounted(async () => {
  enfants.value = await api<Enfant[]>('/enfants').catch(() => [])
  chargerPhotos()
})

function partage(message: string) {
  formulaire.value = false
  notif.succes(`${message} Les parents peuvent maintenant la voir.`)
  chargerPhotos()
}

async function supprimer(p: Photo) {
  const ok = await notif.confirmer({
    titre: 'Supprimer cette photo ?',
    message: 'Elle sera retirée du journal et de la galerie des parents.',
    confirmer: 'Supprimer',
    danger: true,
  })
  if (!ok) return
  await api(`/photos/${p.id}`, { method: 'DELETE' }).then(() => notif.succes('Photo supprimée.'), notif.erreur)
  chargerPhotos(page.value?.page)
}
</script>

<template>
  <div class="conteneur">
    <div class="entete-page">
      <div>
        <h1>Photos</h1>
        <span class="doux">Les photos ne sont visibles que par les parents des enfants identifiés.</span>
      </div>
      <button class="btn btn-pro" :disabled="!enfants.length" @click="formulaire = true">
        + Partager des photos
        <span v-if="!auth.aFonctionnalite('photos')" class="badge-pro">{{ forfaitsStore.pour('photos')?.nom ?? 'Payant' }}</span>
      </button>
    </div>

    <div v-if="!auth.aFonctionnalite('photos')" class="alerte avert">
      <div>
        <strong>Forfait {{ auth.adhesionCourante?.garderie.planEffectifNom }}</strong> — le partage de nouvelles photos est inclus avec
        {{ forfaitsStore.nomsAvec('photos').join(', ') || 'un forfait payant' }}. Les photos déjà publiées restent visibles.
        <RouterLink to="/garderie/parametres">Voir votre forfait</RouterLink>
      </div>
    </div>

    <div v-if="enfants.some((e) => !e.consentementPhoto)" class="alerte avert petit">
      Sans consentement photo : {{ enfants.filter((e) => !e.consentementPhoto).map((e) => e.prenom).join(', ') }}. Ces enfants ne
      peuvent pas être identifiés sur une photo.
    </div>

    <div class="carte">
      <h2>Photos récentes</h2>
      <div v-if="page && !page.photos.length" class="vide">
        <p>Aucune photo pour l'instant.</p>
        <button class="btn btn-pro" :disabled="!enfants.length" @click="formulaire = true">
          Partager les premières photos
          <span v-if="!auth.aFonctionnalite('photos')" class="badge-pro">{{ forfaitsStore.pour('photos')?.nom ?? 'Payant' }}</span>
        </button>
      </div>
      <GaleriePhotos v-if="page" :photos="page.photos" :supprimable="(p) => auth.estAdmin || p.auteurId === auth.moi?.id" @supprimer="supprimer" />
      <div v-else class="grille" aria-busy="true">
        <div v-for="i in 6" :key="i" class="squelette" style="aspect-ratio: 1; border-radius: 14px" />
      </div>
      <div v-if="page && page.pages > 1" class="rangee" style="justify-content: center; margin-top: 1rem">
        <button class="btn secondaire petit" :disabled="page.page <= 1" @click="chargerPhotos(page.page - 1)">‹ Précédentes</button>
        <span class="doux petit">Page {{ page.page }} / {{ page.pages }}</span>
        <button class="btn secondaire petit" :disabled="page.page >= page.pages" @click="chargerPhotos(page.page + 1)">Suivantes ›</button>
      </div>
    </div>

    <FormulaireEntree
      v-if="formulaire"
      :enfants="enfants"
      :selection="[]"
      type-initial="PHOTO"
      @fermer="formulaire = false"
      @enregistre="partage"
    />
  </div>
</template>
