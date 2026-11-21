<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ libelle: string; utilise: number; max: number | null; compact?: boolean }>()

const ratio = computed(() => (props.max ? Math.min(1, props.utilise / props.max) : 0))
const niveau = computed(() => (!props.max ? '' : ratio.value >= 1 ? 'plein' : ratio.value >= 0.8 ? 'presque' : ''))
</script>

<template>
  <div class="jauge" :class="[niveau, { compact }]">
    <div class="rangee-jauge">
      <span class="libelle">{{ libelle }}</span>
      <span class="valeur">
        <strong>{{ utilise }}</strong> / {{ max ?? 'illimité' }}
      </span>
    </div>
    <div v-if="max" class="piste" role="progressbar" :aria-valuenow="utilise" :aria-valuemax="max" :aria-label="libelle">
      <div class="barre" :style="{ width: `${ratio * 100}%` }" />
    </div>
  </div>
</template>

<style scoped>
.jauge {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.rangee-jauge {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.85rem;
}
.libelle {
  color: #334155;
  font-weight: 500;
}
.valeur {
  color: var(--c-texte-doux);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.valeur strong {
  color: var(--c-texte);
}
.piste {
  height: 6px;
  border-radius: 999px;
  background: var(--c-survol);
  overflow: hidden;
}
.barre {
  height: 100%;
  border-radius: inherit;
  background: var(--c-primaire);
  transition: width 0.3s ease;
}
.presque .barre {
  background: #f59e0b;
}
.plein .barre {
  background: var(--c-danger);
}
.plein .valeur strong {
  color: var(--c-danger);
}
.compact .rangee-jauge {
  font-size: 0.78rem;
}
.compact .piste {
  height: 4px;
}
</style>
