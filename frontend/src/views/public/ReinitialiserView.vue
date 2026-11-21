<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'

const route = useRoute()
const router = useRouter()
const motDePasse = ref('')
const confirmation = ref('')
const erreur = ref('')
const envoi = ref(false)

async function enregistrer() {
  erreur.value = ''
  if (motDePasse.value !== confirmation.value) return (erreur.value = 'Les mots de passe ne correspondent pas.')
  envoi.value = true
  try {
    await api('/auth/reinitialiser-mot-de-passe', {
      method: 'POST',
      body: { jeton: String(route.query.jeton ?? ''), motDePasse: motDePasse.value },
      auth: false,
    })
    router.push({ path: '/connexion', query: { reinitialise: '1' } })
  } catch (e) {
    erreur.value = (e as Error).message
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <div class="conteneur etroit">
    <div class="carte" style="padding: 2rem">
      <h1>Nouveau mot de passe</h1>
      <form @submit.prevent="enregistrer">
        <label class="champ">
          <span>Nouveau mot de passe</span>
          <input v-model="motDePasse" type="password" required minlength="8" autocomplete="new-password" />
          <small>8 caractères minimum.</small>
        </label>
        <label class="champ"><span>Confirmer</span><input v-model="confirmation" type="password" required autocomplete="new-password" /></label>
        <div v-if="erreur" class="alerte erreur">{{ erreur }}</div>
        <button class="btn bloc" :disabled="envoi">Enregistrer</button>
      </form>
    </div>
  </div>
</template>
