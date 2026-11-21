<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'

const f = reactive({ nomGarderie: '', adresse: '', telephone: '', prenom: '', nom: '', courriel: '', motDePasse: '', confirmation: '' })
const erreur = ref('')
const envoi = ref(false)
const enAttente = ref(false)

async function inscrire() {
  erreur.value = ''
  if (f.motDePasse !== f.confirmation) return (erreur.value = 'Les mots de passe ne correspondent pas.')
  envoi.value = true
  try {
    const corps = { ...f, confirmation: undefined }
    await api<{ confirmerCourriel: boolean }>('/auth/inscription-garderie', { method: 'POST', body: corps, auth: false })
    enAttente.value = true
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
      <template v-if="enAttente">
        <div class="centre">
          <div class="courrier">✉️</div>
          <h1>Vérifiez votre courriel</h1>
          <p class="doux">
            Votre garderie <strong>{{ f.nomGarderie }}</strong> a été créée.<br />
            Un courriel de confirmation a été envoyé à <strong>{{ f.courriel }}</strong>.
            Cliquez sur le lien pour activer votre compte (valide 48 h).<br />
            Pensez à vérifier vos indésirables.
          </p>
          <RouterLink to="/connexion" class="btn bloc" style="margin-top: 1rem">Aller à la connexion</RouterLink>
        </div>
      </template>
      <template v-else>
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
      </template>
    </div>
  </div>
</template>

<style scoped>
.courrier {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}
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
