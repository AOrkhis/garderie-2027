<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import type { Demarrage } from '@/api/types'

const CLE = 'garderie2027.demarrage-masque'
const etat = ref<Demarrage | null>(null)
const masque = ref(localStorage.getItem(CLE) === '1')

onMounted(async () => {
  if (!masque.value) etat.value = await api<Demarrage>('/garderie/demarrage').catch(() => null)
})

const etapes = computed(() => {
  const e = etat.value
  if (!e) return []
  return [
    { fait: e.groupes > 0, titre: 'Créer vos groupes', texte: 'Ex. : « Poupons », « Les Explorateurs ».', lien: '/garderie/groupes' },
    {
      fait: e.personnel > 1 || e.invitationsPersonnel > 0,
      titre: 'Inviter votre équipe',
      texte: 'Les gestionnaires pourront remplir le journal.',
      lien: '/garderie/personnel',
    },
    { fait: e.enfants > 0, titre: 'Inscrire les enfants', texte: 'Allergies, contacts, consentement photo.', lien: '/garderie/enfants/nouveau' },
    {
      fait: e.parents > 0 || e.invitationsParents > 0,
      titre: 'Inviter les parents',
      texte: "Depuis la fiche de chaque enfant, onglet « Parents ».",
      lien: '/garderie/enfants',
    },
  ]
})
const faites = computed(() => etapes.value.filter((e) => e.fait).length)

function masquer() {
  localStorage.setItem(CLE, '1')
  masque.value = true
}
</script>

<template>
  <div v-if="!masque && etat && faites < etapes.length" class="carte demarrage">
    <div class="rangee">
      <div>
        <h2 style="margin: 0">Bien démarrer</h2>
        <span class="doux petit">{{ faites }} étape(s) sur {{ etapes.length }} complétée(s)</span>
      </div>
      <span class="espace" />
      <button class="btn lien petit" @click="masquer">Masquer</button>
    </div>
    <div class="barre"><div :style="{ width: `${(faites / etapes.length) * 100}%` }" /></div>
    <ol class="etapes">
      <li v-for="(e, i) in etapes" :key="e.titre" :class="{ fait: e.fait }">
        <span class="pastille">{{ e.fait ? '✓' : i + 1 }}</span>
        <div>
          <RouterLink v-if="!e.fait" :to="e.lien"><strong>{{ e.titre }}</strong></RouterLink>
          <strong v-else>{{ e.titre }}</strong>
          <div class="doux petit">{{ e.texte }}</div>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.demarrage {
  margin-bottom: 1.25rem;
  border-color: var(--c-primaire);
  border-width: 1.5px;
}
.barre {
  height: 8px;
  background: var(--c-primaire-clair);
  border-radius: 999px;
  margin: 0.75rem 0;
  overflow: hidden;
}
.barre div {
  height: 100%;
  background: var(--c-primaire);
  border-radius: 999px;
  transition: width 0.3s;
}
.etapes {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
}
.etapes li {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
}
.pastille {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
  border: 2px solid var(--c-primaire);
  color: var(--c-primaire);
}
.fait .pastille {
  background: var(--c-primaire);
  color: #fff;
}
.fait strong {
  text-decoration: line-through;
  color: var(--c-texte-doux);
}
</style>
