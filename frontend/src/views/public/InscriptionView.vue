<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { Jetons } from '@/api/types'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const f = reactive({ nomGarderie: '', adresse: '', telephone: '', prenom: '', nom: '', courriel: '', motDePasse: '', confirmation: '' })
const erreur = ref('')
const envoi = ref(false)

async function inscrire() {
  erreur.value = ''
  if (f.motDePasse !== f.confirmation) return (erreur.value = 'Les mots de passe ne correspondent pas.')
  envoi.value = true
  try {
    const corps = { ...f, confirmation: undefined }
    await auth.ouvrirSession(await api<Jetons>('/auth/inscription-garderie', { method: 'POST', body: corps, auth: false }))
    router.push({ path: '/garderie/aujourd-hui', query: { bienvenue: '1' } })
  } catch (e) {
    erreur.value = (e as Error).message
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <div class="conteneur" style="max-width: 640px">
    <RouterLink to="/" class="btn lien petit" style="padding-left: 0">‹ Accueil</RouterLink>
    <div class="carte auth">
      <h1>Créer ma garderie</h1>
      <p class="doux">Quelques informations pour démarrer. Vous pourrez tout modifier plus tard.</p>
      <form @submit.prevent="inscrire">
        <h3 class="section">La garderie</h3>
        <label class="champ"><span>Nom de la garderie</span><input v-model="f.nomGarderie" required maxlength="150" /></label>
        <div class="deux-colonnes">
          <label class="champ"><span>Adresse</span><input v-model="f.adresse" maxlength="255" /></label>
          <label class="champ"><span>Téléphone</span><input v-model="f.telephone" type="tel" maxlength="30" /></label>
        </div>

        <h3 class="section">Administrateur</h3>
        <div class="deux-colonnes">
          <label class="champ"><span>Prénom</span><input v-model="f.prenom" required maxlength="80" autocomplete="given-name" /></label>
          <label class="champ"><span>Nom</span><input v-model="f.nom" required maxlength="80" autocomplete="family-name" /></label>
        </div>
        <label class="champ"><span>Courriel</span><input v-model="f.courriel" type="email" required autocomplete="email" /></label>
        <div class="deux-colonnes">
          <label class="champ">
            <span>Mot de passe</span>
            <input v-model="f.motDePasse" type="password" required minlength="8" autocomplete="new-password" />
            <small>8 caractères minimum.</small>
          </label>
          <label class="champ"><span>Confirmer</span><input v-model="f.confirmation" type="password" required autocomplete="new-password" /></label>
        </div>

        <div v-if="erreur" class="alerte erreur">{{ erreur }}</div>
        <button class="btn bloc" :disabled="envoi">{{ envoi ? 'Création…' : 'Créer ma garderie' }}</button>
        <p class="centre petit" style="margin-top: 1rem">Déjà inscrit ? <RouterLink to="/connexion">Se connecter</RouterLink></p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.auth {
  padding: 2rem;
}
@media (max-width: 500px) {
  .auth {
    padding: 1.4rem 1.1rem;
  }
}
.section {
  color: var(--c-primaire-fonce);
  border-top: 1px solid var(--c-bord);
  padding-top: 1.1rem;
  margin-top: 1.1rem;
}
.section:first-of-type {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}
</style>
