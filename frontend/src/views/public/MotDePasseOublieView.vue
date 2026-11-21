<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'

const courriel = ref('')
const message = ref('')
const erreur = ref('')
const envoi = ref(false)

async function envoyer() {
  erreur.value = ''
  envoi.value = true
  try {
    const r = await api<{ message: string }>('/auth/mot-de-passe-oublie', { method: 'POST', body: { courriel: courriel.value }, auth: false })
    message.value = r.message
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
      <h1>Mot de passe oublié</h1>
      <div v-if="message" class="alerte">{{ message }}</div>
      <form v-else @submit.prevent="envoyer">
        <p class="doux">Entrez votre courriel : nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>
        <label class="champ"><span>Courriel</span><input v-model="courriel" type="email" required autocomplete="email" /></label>
        <div v-if="erreur" class="alerte erreur">{{ erreur }}</div>
        <button class="btn bloc" :disabled="envoi">Envoyer le lien</button>
      </form>
      <p class="centre petit" style="margin-top: 1rem"><RouterLink to="/connexion">Retour à la connexion</RouterLink></p>
    </div>
  </div>
</template>
