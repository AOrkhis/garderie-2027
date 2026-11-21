<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <nav class="onglets onglets-admin" aria-label="Administration de la plateforme">
    <RouterLink to="/admin/garderies" custom v-slot="{ navigate, isActive }">
      <button :class="{ actif: isActive }" @click="navigate">Garderies</button>
    </RouterLink>
    <RouterLink to="/admin/forfaits" custom v-slot="{ navigate, isActive }">
      <button :class="{ actif: isActive }" @click="navigate">Forfaits et prix</button>
    </RouterLink>
  </nav>
</template>
