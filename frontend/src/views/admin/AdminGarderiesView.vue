<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { GarderieAdmin, PlanGarderie } from '@/api/types'
import { useNotificationsStore } from '@/stores/notifications'
import { formaterDate } from '@/utils/format'

const notif = useNotificationsStore()
const garderies = ref<GarderieAdmin[]>([])
const erreur = ref('')

async function charger() {
  garderies.value = await api<GarderieAdmin[]>('/admin/garderies').catch((e) => ((erreur.value = e.message), []))
}
onMounted(charger)

const enEssai = (g: GarderieAdmin) => !!g.essaiJusquau && new Date(g.essaiJusquau).getTime() > Date.now()

async function modifier(g: GarderieAdmin, champs: Record<string, unknown>, message: string) {
  await api(`/admin/garderies/${g.id}`, { method: 'PATCH', body: champs }).then(() => notif.succes(message), notif.erreur)
  charger()
}

async function changerPlan(g: GarderieAdmin, e: Event) {
  const plan = (e.target as HTMLSelectElement).value as PlanGarderie
  await modifier(g, { plan }, plan === 'PRO' ? `« ${g.nom} » est maintenant Pro.` : `« ${g.nom} » repasse au forfait Gratuit.`)
}

function prolongerEssai(g: GarderieAdmin) {
  const base = enEssai(g) ? new Date(g.essaiJusquau!).getTime() : Date.now()
  modifier(g, { essaiJusquau: new Date(base + 30 * 24 * 3600 * 1000).toISOString() }, `Essai de « ${g.nom} » prolongé de 30 jours.`)
}

async function basculer(g: GarderieAdmin) {
  const statut = g.statut === 'ACTIVE' ? 'SUSPENDUE' : 'ACTIVE'
  if (
    statut === 'SUSPENDUE' &&
    !(await notif.confirmer({
      titre: `Suspendre « ${g.nom} » ?`,
      message: "Plus personne (personnel et parents) ne pourra s'y connecter tant qu'elle n'est pas réactivée.",
      confirmer: 'Suspendre',
      danger: true,
    }))
  )
    return
  await modifier(g, { statut }, statut === 'SUSPENDUE' ? 'Garderie suspendue.' : 'Garderie réactivée.')
}
</script>

<template>
  <div class="conteneur">
    <h1>Garderies de la plateforme</h1>
    <div v-if="erreur" class="alerte erreur">{{ erreur }}</div>
    <div class="carte defile-x">
      <table class="tableau">
        <thead>
          <tr>
            <th>Garderie</th><th>Créée le</th><th>Forfait</th><th>Enfants</th><th>Personnel</th><th>Parents</th><th>Entrées</th><th>Photos</th><th>Statut</th><th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in garderies" :key="g.id">
            <td><strong>{{ g.nom }}</strong><br /><small class="doux">{{ g.courriel }}</small></td>
            <td class="petit">{{ formaterDate(g.creeLe) }}</td>
            <td>
              <select class="choix-plan" :value="g.plan" @change="changerPlan(g, $event)">
                <option value="GRATUIT">Gratuit</option>
                <option value="PRO">Pro</option>
              </select>
              <div class="petit" style="margin-top: 0.25rem">
                <span v-if="enEssai(g)" class="badge orange">Essai jusqu'au {{ formaterDate(g.essaiJusquau!) }}</span>
                <button class="btn lien petit" style="padding: 0; min-height: 0" @click="prolongerEssai(g)">+30 j d'essai</button>
              </div>
            </td>
            <td>{{ g.statistiques.enfants }}</td>
            <td>{{ g.statistiques.personnel }}</td>
            <td>{{ g.statistiques.parents }}</td>
            <td>{{ g.statistiques.entrees }}</td>
            <td>{{ g.statistiques.photos }}</td>
            <td><span class="badge" :class="g.statut === 'ACTIVE' ? 'vert' : 'rouge'">{{ g.statut === 'ACTIVE' ? 'Active' : 'Suspendue' }}</span></td>
            <td><button class="btn lien petit" @click="basculer(g)">{{ g.statut === 'ACTIVE' ? 'Suspendre' : 'Réactiver' }}</button></td>
          </tr>
        </tbody>
      </table>
      <div v-if="!garderies.length" class="vide">Aucune garderie.</div>
    </div>
  </div>
</template>

<style scoped>
.choix-plan {
  width: auto;
  min-height: 0;
  padding: 0.35rem 0.6rem;
  font-size: 0.85rem;
  font-weight: 700;
  border-radius: 8px;
}
</style>
