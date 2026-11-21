<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="conteneur etroit centre">
    <div class="carte">
      <h1>Page introuvable</h1>
      <p class="doux">La page que vous cherchez n'existe pas ou a été déplacée.</p>
      <RouterLink to="/" class="btn">Retour à l'accueil</RouterLink>
    </div>
  </div>
</template>
