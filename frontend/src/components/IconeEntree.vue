<script setup lang="ts">
import type { TypeEntree } from '@/api/types'

defineProps<{ type: TypeEntree; taille?: number }>()

const CHEMINS: Record<TypeEntree, string> = {
  ARRIVEE: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
  DEPART: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  REPAS: 'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7',
  SIESTE: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  ACTIVITE: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
  HYGIENE: 'M12 2.7l5.7 5.6a8 8 0 1 1-11.3 0z',
  HUMEUR: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01',
  REMARQUE: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  PHOTO: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
}

const COULEURS: Record<TypeEntree, string> = {
  ARRIVEE: '#2ea97c',
  DEPART: '#716d8a',
  REPAS: '#e8833a',
  SIESTE: '#6366f1',
  ACTIVITE: '#d9a514',
  HYGIENE: '#2b9fd8',
  HUMEUR: '#e0609b',
  REMARQUE: '#a97d5d',
  PHOTO: '#8b5cf6',
}
</script>

<template>
  <span class="icone" :style="{ background: COULEURS[type] + '1f', color: COULEURS[type], width: `${taille ?? 36}px`, height: `${taille ?? 36}px` }">
    <svg viewBox="0 0 24 24" :width="(taille ?? 36) * 0.55" :height="(taille ?? 36) * 0.55" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path :d="CHEMINS[type]" />
    </svg>
  </span>
</template>

<style scoped>
.icone {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
