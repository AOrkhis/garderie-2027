<script setup lang="ts">
import { useId } from 'vue'

const degrade = `lg-${useId()}`
defineProps<{ taille?: number }>()
</script>

<template>
  <svg viewBox="0 0 32 32" :width="taille ?? 30" :height="taille ?? 30" aria-hidden="true">
    <defs>
      <linearGradient :id="degrade" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#8a6ff0" />
        <stop offset="1" stop-color="#5738c4" />
      </linearGradient>
    </defs>
    <rect x="1.5" y="1.5" width="29" height="29" rx="9" :fill="`url(#${degrade})`" />
    <circle cx="11.5" cy="13" r="2.2" fill="#ffd166" />
    <circle cx="20.5" cy="13" r="2.2" fill="#ff8f5e" />
    <path d="M9 19c2 3 4.5 4.5 7 4.5s5-1.5 7-4.5" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" />
  </svg>
</template>
