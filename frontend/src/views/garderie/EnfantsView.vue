<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import type { Enfant, Groupe } from '@/api/types'
import AvatarEnfant from '@/components/AvatarEnfant.vue'
import { age } from '@/utils/format'

const enfants = ref<Enfant[]>([])
const groupes = ref<Groupe[]>([])
const groupeId = ref<number | ''>('')
const statut = ref<'ACTIF' | 'ARCHIVE'>('ACTIF')
const recherche = ref('')
const chargement = ref(true)
const erreur = ref('')

const normaliser = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const filtres = computed(() =>
  enfants.value.filter((e) => normaliser(`${e.prenom} ${e.nom}`).includes(normaliser(recherche.value))),
)

async function charger() {
  chargement.value = true
  try {
    const q = new URLSearchParams({ statut: statut.value })
    if (groupeId.value) q.set('groupeId', String(groupeId.value))
    enfants.value = await api<Enfant[]>(`/enfants?${q}`)
  } catch (e) {
    erreur.value = (e as Error).message
  } finally {
    chargement.value = false
  }
}

onMounted(async () => {
  groupes.value = await api<Groupe[]>('/groupes').catch(() => [])
  charger()
})
watch([groupeId, statut], charger)
</script>

<template>
  <div class="conteneur">
    <div class="entete-page">
      <div>
        <h1>Enfants</h1>
        <span class="doux">Touchez un enfant pour voir son journal, sa fiche, ses parents et ses photos.</span>
      </div>
      <RouterLink to="/garderie/enfants/nouveau" class="btn">+ Inscrire un enfant</RouterLink>
    </div>

    <div class="carte rangee" style="margin-bottom: 1rem">
      <input v-model="recherche" type="search" placeholder="Rechercher un enfant…" style="flex: 2; min-width: 180px" />
      <select v-model="groupeId" style="flex: 1; min-width: 150px">
        <option value="">Tous les groupes</option>
        <option v-for="g in groupes" :key="g.id" :value="g.id">{{ g.nom }}</option>
      </select>
      <select v-model="statut" style="flex: 1; min-width: 130px">
        <option value="ACTIF">Actifs</option>
        <option value="ARCHIVE">Archivés</option>
      </select>
    </div>

    <div v-if="erreur" class="alerte erreur">{{ erreur }}</div>
    <div v-if="chargement" class="grille" aria-busy="true">
      <div v-for="i in 6" :key="i" class="squelette carte" />
    </div>
    <div v-else-if="!filtres.length" class="vide carte">Aucun enfant trouvé.</div>

    <div class="grille">
      <RouterLink v-for="e in filtres" :key="e.id" :to="`/garderie/enfants/${e.id}`" class="carte enfant">
        <AvatarEnfant :personne="e" :couleur="e.groupe?.couleur" />
        <div style="min-width: 0">
          <strong>{{ e.prenom }} {{ e.nom }}</strong>
          <div class="doux petit">{{ age(e.dateNaissance) }} · {{ e.groupe?.nom ?? 'Sans groupe' }}</div>
          <div class="rangee" style="margin-top: 0.3rem">
            <span v-if="e.allergies" class="badge rouge">Allergies</span>
            <span v-if="!e.consentementPhoto" class="badge orange">Pas de photo</span>
          </div>
        </div>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.enfant {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  text-decoration: none;
  color: inherit;
}
.enfant:hover {
  border-color: var(--c-primaire);
}
</style>
