<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { api } from '@/api/client'
import type { Enfant, JournalJour, PagePhotos } from '@/api/types'
import AvatarEnfant from '@/components/AvatarEnfant.vue'
import ChronologieJournal from '@/components/ChronologieJournal.vue'
import GaleriePhotos from '@/components/GaleriePhotos.vue'
import NavigationDate from '@/components/NavigationDate.vue'
import ResumeJour from '@/components/ResumeJour.vue'
import { age, formaterDate, formaterTranche, PRESENCES } from '@/utils/format'

const route = useRoute()
const id = Number(route.params.id)
const onglet = ref<'journee' | 'photos' | 'fiche'>('journee')
const enfant = ref<Enfant | null>(null)
const journal = ref<JournalJour | null>(null)
const date = ref<string | undefined>()
const photos = ref<PagePhotos | null>(null)
const erreur = ref('')
const couleurHero = computed(() => {
  const c = enfant.value?.groupe?.couleur ?? '#6a4fd8'
  return `linear-gradient(120deg, ${c}, ${c}b8)`
})

async function chargerJournal() {
  try {
    journal.value = await api<JournalJour>(`/enfants/${id}/journal${date.value ? `?date=${date.value}` : ''}`)
  } catch (e) {
    erreur.value = (e as Error).message
  }
}
async function chargerPhotos(page = 1) {
  photos.value = await api<PagePhotos>(`/enfants/${id}/photos?page=${page}`).catch((e) => ((erreur.value = e.message), null))
}

// Actualisation automatique de la journée en cours
let minuteur: ReturnType<typeof setInterval> | undefined
onMounted(async () => {
  enfant.value = await api<Enfant>(`/enfants/${id}`).catch((e) => ((erreur.value = e.message), null))
  await chargerJournal()
  minuteur = setInterval(() => {
    if (onglet.value === 'journee' && journal.value?.date === journal.value?.aujourdhui && !document.hidden) chargerJournal()
  }, 60_000)
})
onUnmounted(() => clearInterval(minuteur))
watch(onglet, (o) => o === 'photos' && !photos.value && chargerPhotos())
</script>

<template>
  <div class="conteneur" style="max-width: 820px">
    <RouterLink to="/parent" class="btn lien petit" style="padding-left: 0">‹ Mes enfants</RouterLink>
    <div v-if="erreur" class="alerte erreur">{{ erreur }}</div>
    <div v-if="!enfant && !erreur" class="pile" aria-busy="true">
      <div class="squelette hero" />
      <div class="squelette carte" />
    </div>

    <template v-if="enfant">
      <header class="hero">
        <div class="bande" :style="{ background: couleurHero }" />
        <div class="corps-hero">
          <AvatarEnfant :personne="enfant" :couleur="enfant.groupe?.couleur" :taille="76" class="avatar-hero" />
          <div>
            <h1>{{ enfant.prenom }}</h1>
            <span class="doux">{{ age(enfant.dateNaissance) }}<template v-if="enfant.groupe"> · {{ enfant.groupe.nom }}</template></span>
          </div>
        </div>
      </header>

      <div class="onglets">
        <button :class="{ actif: onglet === 'journee' }" @click="onglet = 'journee'">Journée</button>
        <button :class="{ actif: onglet === 'photos' }" @click="onglet = 'photos'">Photos</button>
        <button :class="{ actif: onglet === 'fiche' }" @click="onglet = 'fiche'">Fiche</button>
      </div>

      <div v-if="onglet === 'journee' && journal" class="pile">
        <div class="rangee">
          <NavigationDate :date="journal.date" :aujourdhui="journal.aujourdhui" @changer="(d) => ((date = d), chargerJournal())" />
          <span class="espace" />
          <span class="badge" :class="{ vert: journal.presence === 'PRESENT' }">{{ PRESENCES[journal.presence] }}</span>
        </div>
        <div v-if="journal.resume.remarqueImportante" class="alerte avert">Une remarque importante a été ajoutée aujourd'hui.</div>
        <div class="carte"><ResumeJour :resume="journal.resume" /></div>
        <div class="carte"><ChronologieJournal :entrees="journal.entrees" /></div>
      </div>

      <div v-if="onglet === 'photos' && photos" class="carte">
        <div v-if="!photos.photos.length" class="vide">Aucune photo pour l'instant.</div>
        <GaleriePhotos :photos="photos.photos" />
        <div v-if="photos.pages > 1" class="rangee" style="justify-content: center; margin-top: 1rem">
          <button class="btn secondaire petit" :disabled="photos.page <= 1" @click="chargerPhotos(photos.page - 1)">‹ Précédentes</button>
          <span class="doux petit">Page {{ photos.page }} / {{ photos.pages }}</span>
          <button class="btn secondaire petit" :disabled="photos.page >= photos.pages" @click="chargerPhotos(photos.page + 1)">Suivantes ›</button>
        </div>
      </div>

      <div v-if="onglet === 'fiche'" class="grille">
        <div v-if="enfant.groupe" class="carte" :style="{ borderTop: `5px solid ${enfant.groupe.couleur ?? 'var(--c-bord)'}` }">
          <h3>Groupe : {{ enfant.groupe.nom }}</h3>
          <p v-if="formaterTranche(enfant.groupe)" class="doux petit">{{ formaterTranche(enfant.groupe) }}</p>
          <ul v-if="enfant.groupe.description" class="petit" style="padding-left: 1.1rem; margin: 0">
            <li v-for="(l, i) in enfant.groupe.description.split('\n').filter(Boolean)" :key="i">{{ l }}</li>
          </ul>
        </div>
        <div class="carte">
          <h3>Informations</h3>
          <p><span class="doux">Date de naissance :</span> {{ formaterDate(enfant.dateNaissance) }}</p>
          <p><span class="doux">Allergies :</span> {{ enfant.allergies || 'Aucune' }}</p>
          <p><span class="doux">Restrictions alimentaires :</span> {{ enfant.restrictionsAlimentaires || 'Aucune' }}</p>
          <p><span class="doux">Consentement photo :</span> {{ enfant.consentementPhoto ? 'Oui' : 'Non' }}</p>
        </div>
        <div class="carte">
          <h3>Contacts d'urgence</h3>
          <p v-if="!enfant.contactsUrgence?.length" class="doux">Aucun.</p>
          <p v-for="c in enfant.contactsUrgence" :key="c.id">
            <strong>{{ c.nom }}</strong> <span v-if="c.lien" class="doux">({{ c.lien }})</span><br />{{ c.telephone }}
          </p>
          <p class="doux petit">Pour modifier ces informations, contactez votre garderie.</p>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.hero {
  border-radius: var(--rayon);
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--c-bord);
  box-shadow: var(--ombre);
  margin-bottom: 1.1rem;
}
.bande {
  height: 76px;
}
.corps-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.9rem;
  padding: 0 1.25rem 1.1rem;
}
.avatar-hero {
  margin-top: -30px;
  outline: 4px solid #fff;
  border-radius: 50%;
  box-shadow: var(--ombre);
}
.corps-hero h1 {
  margin: 0;
}
</style>
