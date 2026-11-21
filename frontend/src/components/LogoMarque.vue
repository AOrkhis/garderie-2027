<script setup lang="ts">
defineProps<{ taille?: number }>()
</script>

<template>
  <svg viewBox="0 0 32 32" :width="taille ?? 30" :height="taille ?? 30" aria-hidden="true">
    <rect x="1" y="1" width="30" height="30" rx="8" fill="#4f46e5" />
    <path d="M8 15.5 16 9l8 6.5V23a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round" />
    <circle cx="16" cy="17.2" r="2.3" fill="#fff" />
    <path d="M12.6 24c.5-2 1.8-3 3.4-3s2.9 1 3.4 3" fill="#fff" />
  </svg>
</template>
