<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { api } from '@/api/client'
import type { Garderie } from '@/api/types'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const garderie = ref<Garderie | null>(null)
const f = reactive({ nom: '', adresse: '', telephone: '', courriel: '', heuresOuverture: '', fuseauHoraire: 'America/Toronto' })
const FUSEAUX = ['America/Toronto', 'America/Montreal', 'America/Halifax', 'America/Moncton', 'America/Winnipeg', 'America/Edmonton', 'America/Vancouver', 'Europe/Paris', 'Europe/Brussels', 'Europe/Zurich', 'Africa/Casablanca', 'Africa/Dakar', 'Africa/Abidjan', 'Africa/Tunis', 'Africa/Algiers']
const message = ref('')
const erreur = ref('')

onMounted(async () => {
  const g = await api<Garderie>('/garderie')
  garderie.value = g
  Object.assign(f, {
    nom: g.nom,
    adresse: g.adresse ?? '',
    telephone: g.telephone ?? '',
    courriel: g.courriel ?? '',
    heuresOuverture: g.heuresOuverture ?? '',
    fuseauHoraire: g.fuseauHoraire,
  })
})

async function enregistrer() {
  message.value = erreur.value = ''
  try {
    await api('/garderie', { method: 'PATCH', body: { ...f, courriel: f.courriel || undefined } })
    message.value = 'Paramètres enregistrés.'
    auth.chargerMoi()
  } catch (e) {
    erreur.value = (e as Error).message
  }
}
</script>

<template>
  <div class="conteneur" style="max-width: 680px">
    <h1>Paramètres de la garderie</h1>

    <div v-if="garderie" class="carte forfait">
      <div class="rangee" style="margin-bottom: 0.4rem">
        <h2 style="margin: 0">Forfait</h2>
        <span class="espace" />
        <span class="badge" :class="garderie.planEffectif === 'PRO' ? 'vert' : ''">{{ garderie.planEffectif === 'PRO' ? 'Pro' : 'Gratuit' }}</span>
      </div>
      <p v-if="garderie.essaiJusquau && new Date(garderie.essaiJusquau).getTime() > Date.now()" class="petit doux" style="margin: 0">
        Essai Pro jusqu'au {{ new Date(garderie.essaiJusquau).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }) }}
        — partage de photos inclus.
      </p>
      <p v-else-if="garderie.fonctionnalites?.includes('photos')" class="petit doux" style="margin: 0">Partage de photos inclus.</p>
      <p v-else class="petit doux" style="margin: 0">
        Le journal (repas, siestes, activités…) est inclus. Le partage de photos avec les parents nécessite le forfait Pro —
        contactez-nous pour l'activer.
      </p>
    </div>

    <form class="carte" @submit.prevent="enregistrer">
      <label class="champ"><span>Nom</span><input v-model="f.nom" required maxlength="150" /></label>
      <label class="champ"><span>Adresse</span><input v-model="f.adresse" maxlength="255" /></label>
      <div class="deux-colonnes">
        <label class="champ"><span>Téléphone</span><input v-model="f.telephone" type="tel" maxlength="30" /></label>
        <label class="champ"><span>Courriel</span><input v-model="f.courriel" type="email" /></label>
        <label class="champ"><span>Heures d'ouverture</span><input v-model="f.heuresOuverture" placeholder="Ex. : 7 h à 18 h" maxlength="100" /></label>
        <label class="champ">
          <span>Fuseau horaire</span>
          <select v-model="f.fuseauHoraire">
            <option v-for="z in FUSEAUX" :key="z" :value="z">{{ z }}</option>
          </select>
        </label>
      </div>
      <div v-if="message" class="alerte">{{ message }}</div>
      <div v-if="erreur" class="alerte erreur">{{ erreur }}</div>
      <button class="btn">Enregistrer</button>
    </form>
  </div>
</template>
