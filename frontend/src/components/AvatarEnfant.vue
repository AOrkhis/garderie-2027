<script setup lang="ts">
import { computed } from 'vue'
import { initiales } from '@/utils/format'

const props = defineProps<{ personne: { prenom: string; nom: string }; couleur?: string | null; taille?: number }>()

const PALETTE = ['#4f46e5', '#ea580c', '#059669', '#db2777', '#0284c7', '#7c3aed', '#ca8a04']
const fond = computed(
  () => props.couleur || PALETTE[(props.personne.prenom.charCodeAt(0) + props.personne.nom.length) % PALETTE.length],
)
</script>

<template>
  <span class="avatar" :style="{ background: fond, width: `${taille ?? 44}px`, height: `${taille ?? 44}px`, fontSize: `${(taille ?? 44) * 0.38}px` }">
    {{ initiales(personne) }}
  </span>
</template>

<style scoped>
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  font-weight: 700;
  flex-shrink: 0;
}
</style>
