<script setup lang="ts">
import type { Resume } from '@/api/types'
import { formaterDuree, formaterHeure, HUMEURS, MOMENTS, QUANTITES } from '@/utils/format'
import IconeEntree from './IconeEntree.vue'

defineProps<{ resume: Resume }>()
</script>

<template>
  <div class="resume">
    <div class="bloc">
      <IconeEntree type="ARRIVEE" :taille="34" />
      <div>
        <small class="doux">Arrivée / départ</small>
        <div class="valeur">{{ formaterHeure(resume.arrivee) }} – {{ formaterHeure(resume.depart) }}</div>
      </div>
    </div>
    <div class="bloc">
      <IconeEntree type="REPAS" :taille="34" />
      <div>
        <small class="doux">Repas</small>
        <div v-if="!resume.repas.length" class="valeur">—</div>
        <div v-for="(r, i) in resume.repas" :key="i" class="petit valeur">{{ MOMENTS[r.moment] }} : {{ QUANTITES[r.quantite] }}</div>
      </div>
    </div>
    <div class="bloc">
      <IconeEntree type="SIESTE" :taille="34" />
      <div>
        <small class="doux">Sieste</small>
        <div class="valeur">
          {{ resume.siesteMinutes ? formaterDuree(resume.siesteMinutes) : '—' }}
          <span v-if="resume.siesteEnCours" class="badge orange">en cours</span>
        </div>
      </div>
    </div>
    <div class="bloc">
      <IconeEntree type="HUMEUR" :taille="34" />
      <div>
        <small class="doux">Humeur</small>
        <div class="valeur">{{ resume.humeur ? HUMEURS[resume.humeur] : '—' }}</div>
      </div>
    </div>
    <div class="bloc">
      <IconeEntree type="ACTIVITE" :taille="34" />
      <div>
        <small class="doux">Activités · Photos</small>
        <div class="valeur">{{ resume.nombreActivites }} · {{ resume.nombrePhotos }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.resume {
  display: grid;
  gap: 0.6rem;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}
.bloc {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  background: var(--c-fond);
  border-radius: 14px;
  padding: 0.65rem 0.75rem;
}
.bloc small {
  font-weight: 700;
}
.valeur {
  font-weight: 700;
}
</style>
