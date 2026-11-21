<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { GarderieAdmin } from '@/api/types'
import { useNotificationsStore } from '@/stores/notifications'
import { formaterDate } from '@/utils/format'

const notif = useNotificationsStore()
const garderies = ref<GarderieAdmin[]>([])
const erreur = ref('')

async function charger() {
  garderies.value = await api<GarderieAdmin[]>('/admin/garderies').catch((e) => ((erreur.value = e.message), []))
}
onMounted(charger)

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
  await api(`/admin/garderies/${g.id}`, { method: 'PATCH', body: { statut } }).then(
    () => notif.succes(statut === 'SUSPENDUE' ? 'Garderie suspendue.' : 'Garderie réactivée.'),
    notif.erreur,
  )
  charger()
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
            <th>Garderie</th><th>Créée le</th><th>Enfants</th><th>Personnel</th><th>Parents</th><th>Entrées</th><th>Photos</th><th>Statut</th><th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in garderies" :key="g.id">
            <td><strong>{{ g.nom }}</strong><br /><small class="doux">{{ g.courriel }}</small></td>
            <td class="petit">{{ formaterDate(g.creeLe) }}</td>
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
