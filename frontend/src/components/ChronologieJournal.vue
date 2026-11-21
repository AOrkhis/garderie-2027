<script setup lang="ts">
import type { Entree } from '@/api/types'
import { decrireEntree, formaterHeure, TYPES } from '@/utils/format'
import GaleriePhotos from './GaleriePhotos.vue'
import IconeEntree from './IconeEntree.vue'

defineProps<{ entrees: Entree[]; modifiable?: (e: Entree) => boolean }>()
const emit = defineEmits<{ modifier: [entree: Entree]; supprimer: [entree: Entree] }>()
</script>

<template>
  <div v-if="!entrees.length" class="vide">Aucune entrée pour cette journée.</div>
  <ol v-else class="chronologie">
    <li v-for="e in entrees" :key="e.id" :class="{ important: e.type === 'REMARQUE' && e.donnees.importance === 'IMPORTANT' }">
      <div class="heure">{{ formaterHeure(e.heure) }}</div>
      <IconeEntree :type="e.type" />
      <div class="bulle">
        <div class="rangee">
          <strong>{{ e.type === 'ACTIVITE' && e.donnees.titre ? e.donnees.titre : TYPES[e.type] }}</strong>
          <span v-if="e.type === 'REMARQUE' && e.donnees.importance === 'IMPORTANT'" class="badge rouge">Important</span>
          <span class="espace" />
          <template v-if="modifiable?.(e)">
            <button class="btn lien petit" @click="emit('modifier', e)">Modifier</button>
            <button class="btn lien petit" style="color: var(--c-danger)" @click="emit('supprimer', e)">Supprimer</button>
          </template>
        </div>
        <p v-if="decrireEntree(e.type, e.donnees)" class="texte">
          {{ e.type === 'ACTIVITE' ? decrireEntree(e.type, { ...e.donnees, titre: '' }) : decrireEntree(e.type, e.donnees) }}
        </p>
        <GaleriePhotos v-if="e.photos.length" :photos="e.photos" compacte />
        <small v-if="e.auteur" class="doux">Par {{ e.auteur.prenom }}</small>
      </div>
    </li>
  </ol>
</template>

<style scoped>
.chronologie {
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;
}
.chronologie li {
  display: grid;
  grid-template-columns: 52px 40px 1fr;
  gap: 0.7rem;
  padding: 0.55rem 0;
  align-items: start;
  position: relative;
}
/* Fil vertical de la chronologie */
.chronologie li:not(:last-child)::before {
  content: '';
  position: absolute;
  left: calc(52px + 0.7rem + 19px);
  top: 52px;
  bottom: 0;
  width: 2px;
  background: var(--c-bord);
  border-radius: 2px;
}
.heure {
  font-weight: 600;
  color: var(--c-texte-doux);
  padding-top: 0.55rem;
  font-size: 0.85rem;
  text-align: right;
}
.bulle {
  min-width: 0;
  background: var(--c-fond);
  border-radius: 14px;
  padding: 0.7rem 0.9rem;
}
li.important .bulle {
  background: var(--c-danger-clair);
}
.texte {
  margin: 0.15rem 0 0.4rem;
  white-space: pre-line;
}
@media (max-width: 500px) {
  .chronologie li {
    grid-template-columns: 44px 36px 1fr;
    gap: 0.5rem;
  }
  .chronologie li:not(:last-child)::before {
    left: calc(44px + 0.5rem + 17px);
  }
  .heure {
    font-size: 0.75rem;
    padding-top: 0.6rem;
  }
}
</style>
