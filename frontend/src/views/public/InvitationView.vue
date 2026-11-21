<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { Jetons, Role } from '@/api/types'
import LogoMarque from '@/components/LogoMarque.vue'
import { useAuthStore } from '@/stores/auth'
import { ROLES } from '@/utils/format'

interface InfoInvitation {
  courriel: string
  prenom: string | null
  nom: string | null
  role: Role
  garderie: { nom: string }
  enfant: { prenom: string } | null
  compteExiste: boolean
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const jeton = String(route.params.jeton)
const info = ref<InfoInvitation | null>(null)
const erreurChargement = ref('')
const f = reactive({ prenom: '', nom: '', motDePasse: '', confirmation: '' })
const erreur = ref('')
const envoi = ref(false)

onMounted(async () => {
  try {
    info.value = await api<InfoInvitation>(`/invitations/${jeton}`, { auth: false })
    f.prenom = info.value.prenom ?? ''
    f.nom = info.value.nom ?? ''
  } catch (e) {
    erreurChargement.value = (e as Error).message
  }
})

async function accepter() {
  erreur.value = ''
  if (!info.value!.compteExiste && f.motDePasse !== f.confirmation)
    return (erreur.value = 'Les mots de passe ne correspondent pas.')
  envoi.value = true
  try {
    const corps = info.value!.compteExiste ? { motDePasse: f.motDePasse } : { prenom: f.prenom, nom: f.nom, motDePasse: f.motDePasse }
    await auth.ouvrirSession(await api<Jetons>(`/invitations/${jeton}/accepter`, { method: 'POST', body: corps, auth: false }))
    router.push(auth.accueil)
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
      <div v-if="erreurChargement" class="alerte erreur">{{ erreurChargement }}</div>
      <p v-else-if="!info" class="doux">Chargement…</p>
      <template v-else>
        <div class="tete">
          <LogoMarque :taille="52" />
          <h1>Bienvenue !</h1>
        </div>
        <p v-if="info.role === 'PARENT'">
          <strong>{{ info.garderie.nom }}</strong> vous invite à suivre la journée de
          <strong>{{ info.enfant?.prenom ?? 'votre enfant' }}</strong>.
        </p>
        <p v-else>
          <strong>{{ info.garderie.nom }}</strong> vous invite à rejoindre son équipe en tant que
          <strong>{{ ROLES[info.role].toLowerCase() }}</strong>.
        </p>

        <form @submit.prevent="accepter">
          <label class="champ"><span>Courriel</span><input :value="info.courriel" disabled /></label>
          <template v-if="info.compteExiste">
            <div class="alerte">Vous avez déjà un compte. Entrez votre mot de passe pour accepter l'invitation.</div>
            <label class="champ"><span>Mot de passe</span><input v-model="f.motDePasse" type="password" required autocomplete="current-password" /></label>
          </template>
          <template v-else>
            <div class="deux-colonnes">
              <label class="champ"><span>Prénom</span><input v-model="f.prenom" required maxlength="80" /></label>
              <label class="champ"><span>Nom</span><input v-model="f.nom" required maxlength="80" /></label>
            </div>
            <label class="champ">
              <span>Choisissez un mot de passe</span>
              <input v-model="f.motDePasse" type="password" required minlength="8" autocomplete="new-password" />
              <small>8 caractères minimum.</small>
            </label>
            <label class="champ"><span>Confirmer</span><input v-model="f.confirmation" type="password" required autocomplete="new-password" /></label>
          </template>
          <div v-if="erreur" class="alerte erreur">{{ erreur }}</div>
          <button class="btn bloc" :disabled="envoi">Accepter l'invitation</button>
        </form>
      </template>
    </div>
  </div>
</template>

<style scoped>
.tete {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 1rem;
}
.tete h1 {
  margin: 0.75rem 0 0;
}
</style>
