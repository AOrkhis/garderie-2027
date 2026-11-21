<script setup lang="ts">
import { decalerDate, formaterDateLongue } from '@/utils/format'

const props = defineProps<{ date: string; aujourdhui: string }>()
const emit = defineEmits<{ changer: [date: string] }>()

const aller = (jours: number) => emit('changer', decalerDate(props.date, jours))
</script>

<template>
  <div class="nav-date">
    <button class="fleche" aria-label="Jour précédent" @click="aller(-1)">‹</button>
    <label class="date">
      <strong>{{ date === aujourdhui ? "Aujourd'hui" : formaterDateLongue(date) }}</strong>
      <input type="date" :value="date" :max="aujourdhui" @change="emit('changer', ($event.target as HTMLInputElement).value || aujourdhui)" />
    </label>
    <button class="fleche" aria-label="Jour suivant" :disabled="date >= aujourdhui" @click="aller(1)">›</button>
    <button v-if="date !== aujourdhui" class="btn lien petit" @click="emit('changer', aujourdhui)">Aujourd'hui</button>
  </div>
</template>

<style scoped>
.nav-date {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.fleche {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1.5px solid var(--c-bord);
  background: #fff;
  font: inherit;
  font-size: 1.2rem;
  line-height: 1;
  color: var(--c-texte-doux);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.fleche:hover:not(:disabled) {
  border-color: var(--c-primaire);
  color: var(--c-primaire);
}
.fleche:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.date {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.date input {
  width: auto;
  padding: 0.35rem 0.5rem;
  min-height: 0;
  border-radius: 9px;
}
</style>
