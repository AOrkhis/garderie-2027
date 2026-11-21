<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { api } from '@/api/client'
import type { Groupe, Invitation, MembrePersonnel, ResultatInvitation, Role } from '@/api/types'
import LienInvitation from '@/components/LienInvitation.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { formaterDate, ROLES } from '@/utils/format'

const auth = useAuthStore()
const notif = useNotificationsStore()
const membres = ref<MembrePersonnel[]>([])
const invitations = ref<Invitation[]>([])
const groupes = ref<Groupe[]>([])
const f = reactive({ courriel: '', prenom: '', nom: '', role: 'GESTIONNAIRE' as Role, groupeIds: [] as number[] })
const lienCopie = ref<{ lien: string; courriel: string } | null>(null)
const envoi = ref(false)

async function charger() {
  try {
    const r = await api<{ membres: MembrePersonnel[]; invitations: Invitation[] }>('/personnel')
    membres.value = r.membres
    invitations.value = r.invitations
  } catch (e) {
    notif.erreur(e)
  }
}

onMounted(async () => {
  await charger()
  groupes.value = await api<Groupe[]>('/groupes').catch(() => [])
})

async function inviter() {
  envoi.value = true
  try {
    const r = await api<ResultatInvitation>('/personnel/invitations', { method: 'POST', body: f })
    notif.succes(`Invitation envoyée à ${f.courriel}.`)
    lienCopie.value = r.lienInvitation ? { lien: r.lienInvitation, courriel: f.courriel } : null
    Object.assign(f, { courriel: '', prenom: '', nom: '', groupeIds: [] })
    charger()
  } catch (e) {
    notif.erreur(e)
  } finally {
    envoi.value = false
  }
}

async function modifier(m: MembrePersonnel, corps: { actif?: boolean; role?: Role }) {
  const nom = `${m.utilisateur.prenom} ${m.utilisateur.nom}`
  if (corps.actif === false) {
    const ok = await notif.confirmer({
      titre: `Désactiver ${nom} ?`,
      message: 'Cette personne ne pourra plus se connecter à votre garderie. Vous pourrez la réactiver à tout moment.',
      confirmer: 'Désactiver',
      danger: true,
    })
    if (!ok) return
  }
  try {
    await api(`/personnel/${m.adhesionId}`, { method: 'PATCH', body: corps })
    notif.succes(
      corps.role ? `${nom} est maintenant ${ROLES[corps.role].toLowerCase()}.` : corps.actif ? `${nom} est réactivé(e).` : `${nom} est désactivé(e).`,
    )
  } catch (e) {
    notif.erreur(e)
  }
  charger()
}

async function renvoyer(i: Invitation) {
  try {
    const r = await api<ResultatInvitation>(`/personnel/invitations/${i.id}/renvoyer`, { method: 'POST' })
    notif.succes(`Nouvelle invitation envoyée à ${i.courriel}.`)
    lienCopie.value = r.lienInvitation ? { lien: r.lienInvitation, courriel: i.courriel } : null
    charger()
  } catch (e) {
    notif.erreur(e)
  }
}

async function annuler(i: Invitation) {
  await api(`/personnel/invitations/${i.id}`, { method: 'DELETE' }).then(() => notif.info('Invitation annulée.'), notif.erreur)
  charger()
}

const basculer = (id: number) =>
  (f.groupeIds = f.groupeIds.includes(id) ? f.groupeIds.filter((x) => x !== id) : [...f.groupeIds, id])
</script>

<template>
  <div class="conteneur">
    <div class="entete-page">
      <div>
        <h1>Personnel</h1>
        <span class="doux">Invitez vos éducatrices et gérez leurs accès.</span>
      </div>
    </div>
    <LienInvitation v-if="lienCopie" :lien="lienCopie.lien" :courriel="lienCopie.courriel" @fermer="lienCopie = null" />

    <div class="pile">
      <div class="carte defile-x">
        <h2>Équipe</h2>
        <p v-if="membres.length <= 1 && !invitations.length" class="doux petit">
          Vous êtes seul(e) pour l'instant. Invitez votre équipe avec le formulaire ci-dessous.
        </p>
        <table class="tableau">
          <thead>
            <tr><th>Nom</th><th>Courriel</th><th>Rôle</th><th>Statut</th><th /></tr>
          </thead>
          <tbody>
            <tr v-for="m in membres" :key="m.adhesionId">
              <td><strong>{{ m.utilisateur.prenom }} {{ m.utilisateur.nom }}</strong></td>
              <td class="petit">{{ m.utilisateur.courriel }}</td>
              <td>
                <select
                  v-if="m.adhesionId !== auth.moi?.adhesionCourante"
                  :value="m.role"
                  style="width: auto"
                  @change="modifier(m, { role: ($event.target as HTMLSelectElement).value as Role })"
                >
                  <option value="GESTIONNAIRE">{{ ROLES.GESTIONNAIRE }}</option>
                  <option value="ADMIN">{{ ROLES.ADMIN }}</option>
                </select>
                <span v-else>{{ ROLES[m.role] }} (vous)</span>
              </td>
              <td><span class="badge" :class="m.actif ? 'vert' : 'rouge'">{{ m.actif ? 'Actif' : 'Désactivé' }}</span></td>
              <td>
                <button v-if="m.adhesionId !== auth.moi?.adhesionCourante" class="btn lien petit" @click="modifier(m, { actif: !m.actif })">
                  {{ m.actif ? 'Désactiver' : 'Réactiver' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <template v-if="invitations.length">
          <h3 style="margin-top: 1.25rem">Invitations en attente</h3>
          <table class="tableau">
            <tbody>
              <tr v-for="i in invitations" :key="i.id">
                <td>{{ i.prenom }} {{ i.nom }}</td>
                <td class="petit">{{ i.courriel }}</td>
                <td>{{ i.role ? ROLES[i.role] : '' }}</td>
                <td class="petit doux">Expire le {{ formaterDate(i.expireLe) }}</td>
                <td style="white-space: nowrap">
                  <button class="btn secondaire petit" @click="renvoyer(i)">Renvoyer</button>
                  <button class="btn lien petit" @click="annuler(i)">Annuler</button>
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>

      <form class="carte" style="max-width: 620px" @submit.prevent="inviter">
        <h2>Inviter un membre du personnel</h2>
        <label class="champ"><span>Courriel</span><input v-model="f.courriel" type="email" required /></label>
        <div class="deux-colonnes">
          <label class="champ"><span>Prénom</span><input v-model="f.prenom" maxlength="80" /></label>
          <label class="champ"><span>Nom</span><input v-model="f.nom" maxlength="80" /></label>
        </div>
        <label class="champ">
          <span>Rôle</span>
          <select v-model="f.role">
            <option value="GESTIONNAIRE">Gestionnaire — journal, enfants et photos</option>
            <option value="ADMIN">Administrateur — accès complet à la garderie</option>
          </select>
        </label>
        <div v-if="groupes.length" class="champ">
          <span>Groupes assignés (facultatif)</span>
          <div class="puces">
            <button v-for="g in groupes" :key="g.id" type="button" class="puce" :class="{ actif: f.groupeIds.includes(g.id) }" @click="basculer(g.id)">
              {{ g.nom }}
            </button>
          </div>
        </div>
        <button class="btn" :disabled="envoi">Envoyer l'invitation</button>
      </form>
    </div>
  </div>
</template>
