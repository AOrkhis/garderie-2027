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
const enfant = ref<Enfant | null>(null)
const journal = ref<JournalJour | null>(null)
const date = ref<string | undefined>()
const photos = ref<PagePhotos | null>(null)
const voirToutesPhotos = ref(false)
const erreur = ref('')
const couleurHero = computed(() => {
  const c = enfant.value?.groupe?.couleur ?? '#6a4fd8'
  return `linear-gradient(120deg, ${c}, ${c}b8)`
})
const photosDuJour = computed(() => photos.value?.photos.slice(0, 4) ?? [])
const estAujourdhui = computed(() => journal.value?.date === journal.value?.aujourdhui)

async function chargerJournal() {
  try {
    journal.value = await api<JournalJour>(`/enfants/${id}/journal${date.value ? `?date=${date.value}` : ''}`)
    chargerPhotos()
  } catch (e) {
    erreur.value = (e as Error).message
  }
}
async function chargerPhotos(page = 1) {
  const d = date.value ?? journal.value?.date
  photos.value = await api<PagePhotos>(`/enfants/${id}/photos?page=${page}${d ? `&date=${d}` : ''}`).catch((e) => ((erreur.value = e.message), null))
}

// Actualisation automatique de la journée en cours
let minuteur: ReturnType<typeof setInterval> | undefined
onMounted(async () => {
  enfant.value = await api<Enfant>(`/enfants/${id}`).catch((e) => ((erreur.value = e.message), null))
  await chargerJournal()
  minuteur = setInterval(() => {
    if (estAujourdhui.value && !document.hidden) chargerJournal()
  }, 60_000)
})
onUnmounted(() => clearInterval(minuteur))
watch(voirToutesPhotos, (v) => v && chargerPhotos(photos.value?.page ?? 1))
</script>

<template>
  <div class="conteneur" style="max-width: 640px">
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
          <div class="qui">
            <h1>{{ enfant.prenom }}</h1>
            <span class="sous">
              {{ age(enfant.dateNaissance) }}<template v-if="enfant.groupe"> · {{ enfant.groupe.nom }}</template>
            </span>
            <span v-if="journal" class="badge" :class="{ vert: journal.presence === 'PRESENT' }" style="align-self: flex-start">
              {{ PRESENCES[journal.presence] }}
            </span>
          </div>
        </div>
      </header>

      <template v-if="journal">
        <div v-if="journal.resume.remarqueImportante" class="alerte avert">Une remarque importante a été ajoutée.</div>

        <div class="carte">
          <div class="rangee entete-carte">
            <h2>En bref</h2>
            <NavigationDate :date="journal.date" :aujourdhui="journal.aujourdhui" @changer="(d) => ((date = d), chargerJournal())" />
          </div>
          <ResumeJour :resume="journal.resume" />
        </div>

        <div v-if="photosDuJour.length || voirToutesPhotos" class="carte">
          <div class="rangee entete-carte">
            <h2>Photos{{ photos ? ` (${photos.total ?? photos.photos.length})` : '' }}</h2>
            <button v-if="!voirToutesPhotos" type="button" class="btn lien petit" @click="voirToutesPhotos = true">Tout voir ›</button>
          </div>
          <GaleriePhotos v-if="voirToutesPhotos" :photos="photos?.photos ?? []" />
          <div v-else class="apercu-photos">
            <GaleriePhotos :photos="photosDuJour" />
          </div>
          <div v-if="voirToutesPhotos && photos && photos.pages > 1" class="rangee" style="justify-content: center; margin-top: 1rem">
            <button class="btn secondaire petit" :disabled="photos.page <= 1" @click="chargerPhotos(photos.page - 1)">‹ Précédentes</button>
            <span class="doux petit">Page {{ photos.page }} / {{ photos.pages }}</span>
            <button class="btn secondaire petit" :disabled="photos.page >= photos.pages" @click="chargerPhotos(photos.page + 1)">Suivantes ›</button>
          </div>
        </div>

        <div class="carte">
          <h2 class="entete-carte">Sa journée, heure par heure</h2>
          <ChronologieJournal :entrees="journal.entrees" />
        </div>
      </template>

      <details class="carte fiche">
        <summary>Fiche de {{ enfant.prenom }} (allergies, contacts…)</summary>
        <div class="blocs-fiche">
          <div>
            <h3>Groupe : {{ enfant.groupe?.nom ?? '—' }}</h3>
            <p v-if="enfant.groupe && formaterTranche(enfant.groupe)" class="doux petit">{{ formaterTranche(enfant.groupe) }}</p>
            <ul v-if="enfant.groupe?.description" class="petit" style="padding-left: 1.1rem; margin: 0">
              <li v-for="(l, i) in enfant.groupe.description.split('\n').filter(Boolean)" :key="i">{{ l }}</li>
            </ul>
          </div>
          <div>
            <h3>Informations</h3>
            <p><span class="doux">Date de naissance :</span> {{ formaterDate(enfant.dateNaissance) }}</p>
            <p><span class="doux">Allergies :</span> <strong :class="{ danger: enfant.allergies }">{{ enfant.allergies || 'Aucune' }}</strong></p>
            <p><span class="doux">Restrictions alimentaires :</span> {{ enfant.restrictionsAlimentaires || 'Aucune' }}</p>
            <p><span class="doux">Consentement photo :</span> {{ enfant.consentementPhoto ? 'Oui' : 'Non' }}</p>
          </div>
          <div>
            <h3>Contacts d'urgence</h3>
            <p v-if="!enfant.contactsUrgence?.length" class="doux">Aucun.</p>
            <p v-for="c in enfant.contactsUrgence" :key="c.id">
              <strong>{{ c.nom }}</strong> <span v-if="c.lien" class="doux">({{ c.lien }})</span><br />{{ c.telephone }}
            </p>
            <p class="doux petit">Pour modifier ces informations, contactez votre garderie.</p>
          </div>
        </div>
      </details>
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
  align-items: flex-end;
  gap: 0.9rem;
  padding: 0 1.25rem 1.1rem;
}
.avatar-hero {
  margin-top: -30px;
  outline: 4px solid #fff;
  border-radius: 50%;
  box-shadow: var(--ombre);
}
.qui {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.corps-hero h1 {
  margin: 0;
}
.sous {
  color: var(--c-texte-doux);
}
.entete-carte {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin: -0.2rem 0 0.9rem;
}
h2 {
  margin: 0;
  font-size: 1.02rem;
}
.fiche {
  padding: 0;
}
.fiche summary {
  padding: 1rem 1.25rem;
  cursor: pointer;
  font-weight: 600;
  color: var(--c-texte-doux);
}
.fiche[open] summary {
  border-bottom: 1px solid var(--c-bord);
  margin-bottom: 0.5rem;
}
.blocs-fiche {
  padding: 0 1.25rem 0.5rem;
  display: grid;
  gap: 0.5rem;
}
.blocs-fiche h3 {
  margin: 0.6rem 0 0.3rem;
}
.blocs-fiche p {
  margin: 0.25rem 0;
}
.danger {
  color: var(--c-danger);
}
</style>
