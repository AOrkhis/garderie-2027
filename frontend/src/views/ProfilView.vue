<script setup lang="ts">
import { reactive, ref } from 'vue'
import { api } from '@/api/client'
import type { Jetons, Moi } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/format'

const auth = useAuthStore()
const profil = reactive({ prenom: auth.moi?.prenom ?? '', nom: auth.moi?.nom ?? '', telephone: auth.moi?.telephone ?? '' })
const mdp = reactive({ actuel: '', nouveau: '', confirmation: '' })
const message = ref('')
const erreur = ref('')

async function enregistrerProfil() {
  message.value = erreur.value = ''
  try {
    auth.moi = await api<Moi>('/auth/moi', { method: 'PATCH', body: profil })
    message.value = 'Profil enregistré.'
  } catch (e) {
    erreur.value = (e as Error).message
  }
}

async function changerMotDePasse() {
  message.value = erreur.value = ''
  if (mdp.nouveau !== mdp.confirmation) return (erreur.value = 'Les mots de passe ne correspondent pas.')
  try {
    await auth.ouvrirSession(
      await api<Jetons>('/auth/moi/mot-de-passe', { method: 'POST', body: { actuel: mdp.actuel, nouveau: mdp.nouveau } }),
    )
    Object.assign(mdp, { actuel: '', nouveau: '', confirmation: '' })
    message.value = 'Mot de passe modifié.'
  } catch (e) {
    erreur.value = (e as Error).message
  }
}
</script>

<template>
  <div class="conteneur" style="max-width: 680px">
    <h1>Mon profil</h1>
    <div v-if="message" class="alerte">{{ message }}</div>
    <div v-if="erreur" class="alerte erreur">{{ erreur }}</div>

    <div class="pile">
      <form class="carte" @submit.prevent="enregistrerProfil">
        <h2>Informations</h2>
        <label class="champ"><span>Courriel</span><input :value="auth.moi?.courriel" disabled /></label>
        <div class="deux-colonnes">
          <label class="champ"><span>Prénom</span><input v-model="profil.prenom" required maxlength="80" /></label>
          <label class="champ"><span>Nom</span><input v-model="profil.nom" required maxlength="80" /></label>
        </div>
        <label class="champ"><span>Téléphone</span><input v-model="profil.telephone" type="tel" maxlength="30" /></label>
        <button class="btn">Enregistrer</button>
      </form>

      <form class="carte" @submit.prevent="changerMotDePasse">
        <h2>Mot de passe</h2>
        <label class="champ"><span>Mot de passe actuel</span><input v-model="mdp.actuel" type="password" required autocomplete="current-password" /></label>
        <div class="deux-colonnes">
          <label class="champ"><span>Nouveau</span><input v-model="mdp.nouveau" type="password" required minlength="8" autocomplete="new-password" /></label>
          <label class="champ"><span>Confirmer</span><input v-model="mdp.confirmation" type="password" required autocomplete="new-password" /></label>
        </div>
        <button class="btn">Changer le mot de passe</button>
      </form>

      <div v-if="auth.moi?.adhesions.length" class="carte">
        <h2>Mes garderies</h2>
        <p v-for="a in auth.moi.adhesions" :key="a.id" class="rangee">
          <strong>{{ a.garderie.nom }}</strong>
          <span class="badge">{{ ROLES[a.role] }}</span>
          <span v-if="a.id === auth.moi.adhesionCourante" class="badge vert">Active</span>
        </p>
      </div>
    </div>
  </div>
</template>
