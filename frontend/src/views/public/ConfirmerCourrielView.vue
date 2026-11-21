<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { Jetons } from '@/api/types'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const etat = ref<'chargement' | 'erreur'>('chargement')
const message = ref('')

onMounted(async () => {
  try {
    const jetons = await api<Jetons>('/auth/confirmer-courriel', {
      method: 'POST',
      body: { jeton: route.params.jeton },
      auth: false,
    })
    await auth.ouvrirSession(jetons)
    router.push({ path: auth.accueil, query: { bienvenue: '1' } })
  } catch (e) {
    etat.value = 'erreur'
    message.value = (e as Error).message
  }
})
</script>

<template>
  <div class="conteneur etroit">
    <div class="carte centre" style="padding: 2rem">
      <template v-if="etat === 'chargement'">
        <h1>Confirmation en cours…</h1>
        <p class="doux">Nous validons votre courriel.</p>
      </template>
      <template v-else>
        <h1>Lien invalide</h1>
        <p class="doux">{{ message }}</p>
        <p class="doux">Vous pouvez demander un nouveau lien depuis la page de connexion.</p>
        <RouterLink to="/connexion" class="btn bloc" style="margin-top: 1rem">Aller à la connexion</RouterLink>
      </template>
    </div>
  </div>
</template>
