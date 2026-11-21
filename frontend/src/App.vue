<script setup lang="ts">
import { RouterView } from 'vue-router'
import BarreNavigation from '@/components/BarreNavigation.vue'
import CentreNotifications from '@/components/CentreNotifications.vue'
import { useAuthStore } from '@/stores/auth'
import { useForfaitsStore } from '@/stores/forfaits'

const auth = useAuthStore()
useForfaitsStore().charger()
</script>

<template>
  <div class="appli" :class="{ connecte: auth.connecte }">
    <BarreNavigation />
    <main class="zone">
      <RouterView />
    </main>
    <CentreNotifications />
  </div>
</template>
