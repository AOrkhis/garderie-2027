<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import LogoMarque from '@/components/LogoMarque.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const courriel = ref('')
const motDePasse = ref('')
const erreur = ref('')
const envoi = ref(false)

async function connecter() {
  erreur.value = ''
  envoi.value = true
  try {
    await auth.connexion(courriel.value, motDePasse.value)
    const suite = typeof route.query.suite === 'string' && route.query.suite.startsWith('/') ? route.query.suite : auth.accueil
    router.push(suite)
  } catch (e) {
    erreur.value = (e as Error).message
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <div class="conteneur etroit">
    <div class="carte auth">
      <div class="tete">
        <LogoMarque :taille="52" />
        <h1>Bonjour !</h1>
        <p class="doux">Connectez-vous à votre compte.</p>
      </div>
      <div v-if="route.query.expire" class="alerte avert">Votre session a expiré. Veuillez vous reconnecter.</div>
      <div v-if="route.query.reinitialise" class="alerte">Votre mot de passe a été modifié. Vous pouvez vous connecter.</div>
      <form @submit.prevent="connecter">
        <label class="champ"><span>Courriel</span><input v-model="courriel" type="email" required autocomplete="email" /></label>
        <label class="champ"><span>Mot de passe</span><input v-model="motDePasse" type="password" required autocomplete="current-password" /></label>
        <div v-if="erreur" class="alerte erreur">{{ erreur }}</div>
        <button class="btn bloc" :disabled="envoi">{{ envoi ? 'Connexion…' : 'Se connecter' }}</button>
      </form>
      <p class="centre petit" style="margin-top: 1rem">
        <RouterLink to="/mot-de-passe-oublie">Mot de passe oublié ?</RouterLink>
      </p>
      <p class="centre petit doux">
        Vous êtes un parent ? Utilisez le lien d'invitation reçu de votre garderie.<br />
        Vous gérez une garderie ? <RouterLink to="/inscription">Créez votre compte</RouterLink>.
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth {
  padding: 2rem;
}
.tete {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 1.5rem;
}
.tete h1 {
  margin: 0.75rem 0 0.15rem;
}
.tete p {
  margin: 0;
}
</style>
