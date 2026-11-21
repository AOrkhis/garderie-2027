<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { EnfantParent } from '@/api/types'
import AvatarEnfant from '@/components/AvatarEnfant.vue'
import IconeEntree from '@/components/IconeEntree.vue'
import { useAuthStore } from '@/stores/auth'
import { age, decrireEntree, formaterHeure, TYPES } from '@/utils/format'

const auth = useAuthStore()
const router = useRouter()
const enfants = ref<EnfantParent[] | null>(null)
const erreur = ref('')

onMounted(async () => {
  try {
    enfants.value = await api<EnfantParent[]>('/parent/enfants')
    if (enfants.value.length === 1) router.replace(`/parent/enfants/${enfants.value[0]!.id}`)
  } catch (e) {
    erreur.value = (e as Error).message
  }
})
</script>

<template>
  <div class="conteneur">
    <div class="salut">
      <div>
        <h1>Bonjour {{ auth.moi?.prenom }} !</h1>
        <p class="doux" style="margin: 0">{{ auth.adhesionCourante?.garderie.nom }}</p>
      </div>
    </div>
    <div v-if="erreur" class="alerte erreur">{{ erreur }}</div>
    <div v-if="enfants && !enfants.length" class="vide carte">Aucun enfant n'est encore associé à votre compte.</div>

    <div class="grille">
      <RouterLink v-for="e in enfants" :key="e.id" :to="`/parent/enfants/${e.id}`" class="carte enfant">
        <div class="rangee" style="flex-wrap: nowrap">
          <AvatarEnfant :personne="e" :couleur="e.groupe?.couleur" :taille="56" />
          <div>
            <h2 style="margin: 0">{{ e.prenom }}</h2>
            <span class="doux petit">{{ age(e.dateNaissance) }} · {{ e.groupe?.nom ?? '' }}</span>
          </div>
        </div>
        <div v-if="e.derniereEntree" class="rangee derniere" style="flex-wrap: nowrap">
          <IconeEntree :type="e.derniereEntree.type" :taille="30" />
          <div class="petit">
            <strong>{{ formaterHeure(e.derniereEntree.heure) }} — {{ TYPES[e.derniereEntree.type] }}</strong><br />
            <span class="doux">{{ decrireEntree(e.derniereEntree.type, e.derniereEntree.donnees) }}</span>
          </div>
        </div>
        <p v-else class="doux petit" style="margin: 0">Rien de nouveau aujourd'hui pour l'instant.</p>
        <span class="petit" style="color: var(--c-primaire); font-weight: 800">
          Voir la journée ({{ e.nombreEntreesAujourdhui }} entrée{{ e.nombreEntreesAujourdhui > 1 ? 's' : '' }}) ›
        </span>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.salut {
  background: linear-gradient(120deg, var(--c-primaire-clair), #fdeee4);
  border-radius: var(--rayon);
  padding: 1.4rem 1.5rem;
  margin-bottom: 1.25rem;
}
.salut h1 {
  margin: 0;
}
.enfant {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  text-decoration: none;
  color: inherit;
}
.derniere {
  background: var(--c-fond);
  border-radius: 12px;
  padding: 0.65rem;
  align-items: flex-start;
}
</style>
