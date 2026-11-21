<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { GarderieAdmin, PlanGarderie } from '@/api/types'
import { useNotificationsStore } from '@/stores/notifications'
import { formaterDate } from '@/utils/format'

interface Fonctionnalite {
  cle: string
  libelle: string
}

const notif = useNotificationsStore()
const garderies = ref<GarderieAdmin[]>([])
const catalogue = ref<Fonctionnalite[]>([])
const erreur = ref('')
const ouvertes = ref<Set<number>>(new Set())

async function charger() {
  ;[garderies.value, catalogue.value] = await Promise.all([
    api<GarderieAdmin[]>('/admin/garderies').catch((e) => ((erreur.value = e.message), [])),
    api<Fonctionnalite[]>('/admin/fonctionnalites').catch(() => []),
  ])
}
onMounted(charger)

const enEssai = (g: GarderieAdmin) => !!g.essaiJusquau && new Date(g.essaiJusquau).getTime() > Date.now()

const totaux = computed(() => ({
  total: garderies.value.length,
  actives: garderies.value.filter((g) => g.statut === 'ACTIVE').length,
  pro: garderies.value.filter((g) => g.planEffectif === 'PRO').length,
  essais: garderies.value.filter(enEssai).length,
}))

function basculerDetails(id: number) {
  const s = new Set(ouvertes.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  ouvertes.value = s
}

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

async function basculerStatut(g: GarderieAdmin) {
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

async function basculerFonctionnalite(g: GarderieAdmin, cle: string) {
  const extras = new Set(g.fonctionnalitesExtra ?? [])
  const active = extras.has(cle)
  if (active) extras.delete(cle)
  else extras.add(cle)
  await modifier(
    g,
    { fonctionnalitesExtra: [...extras] },
    active ? `« ${cle} » retiré pour « ${g.nom} ».` : `« ${cle} » accordé à « ${g.nom} ».`,
  )
}
</script>

<template>
  <div class="conteneur">
    <h1>Garderies de la plateforme</h1>
    <div v-if="erreur" class="alerte erreur">{{ erreur }}</div>

    <div v-if="garderies.length" class="resume">
      <div class="mini"><strong>{{ totaux.total }}</strong><small class="doux">garderies</small></div>
      <div class="mini"><strong>{{ totaux.actives }}</strong><small class="doux">actives</small></div>
      <div class="mini"><strong>{{ totaux.pro }}</strong><small class="doux">forfait Pro</small></div>
      <div class="mini"><strong>{{ totaux.essais }}</strong><small class="doux">en essai</small></div>
    </div>

    <div class="carte defile-x">
      <table class="tableau">
        <thead>
          <tr>
            <th>Garderie</th><th>Créée le</th><th>Forfait</th><th>Enfants</th><th>Personnel</th><th>Parents</th><th>Entrées</th><th>Photos</th><th>Statut</th><th />
          </tr>
        </thead>
        <tbody>
          <template v-for="g in garderies" :key="g.id">
            <tr>
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
              <td>
                <button class="btn lien petit" @click="basculerStatut(g)">{{ g.statut === 'ACTIVE' ? 'Suspendre' : 'Réactiver' }}</button>
                <button class="btn lien petit" @click="basculerDetails(g.id)">{{ ouvertes.has(g.id) ? 'Masquer' : 'Détails' }}</button>
              </td>
            </tr>
            <tr v-if="ouvertes.has(g.id)" class="details">
              <td :colspan="10">
                <div class="bloc-details">
                  <div>
                    <h3>Accès aux fonctionnalités</h3>
                    <label v-for="f in catalogue" :key="f.cle" class="case">
                      <input
                        type="checkbox"
                        :checked="g.fonctionnalitesEffectives.includes(f.cle)"
                        :disabled="g.fonctionnalitesPlan.includes(f.cle)"
                        @change="basculerFonctionnalite(g, f.cle)"
                      />
                      {{ f.libelle }}
                      <small v-if="g.fonctionnalitesPlan.includes(f.cle)" class="doux">— inclus dans {{ g.planEffectif === 'PRO' ? 'Pro' : 'le plan' }}</small>
                      <small v-else-if="(g.fonctionnalitesExtra ?? []).includes(f.cle)" class="badge vert">accordé</small>
                    </label>
                    <p v-if="!catalogue.length" class="doux petit">Aucune fonctionnalité payante pour l'instant.</p>
                  </div>
                  <div>
                    <h3>Équipe (admins)</h3>
                    <p v-if="!g.admins.length" class="doux petit">Aucun administrateur actif.</p>
                    <ul class="admins">
                      <li v-for="a in g.admins" :key="a.courriel"><strong>{{ a.nom }}</strong> · <span class="doux">{{ a.courriel }}</span></li>
                    </ul>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <div v-if="!garderies.length" class="vide">Aucune garderie.</div>
    </div>
  </div>
</template>

<style scoped>
.resume {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
.mini {
  background: #fff;
  border: 1px solid var(--c-bord);
  border-radius: 14px;
  padding: 0.7rem 0.9rem;
  display: flex;
  flex-direction: column;
}
.mini strong {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--c-primaire-fonce);
}
.choix-plan {
  width: auto;
  min-height: 0;
  padding: 0.35rem 0.6rem;
  font-size: 0.85rem;
  font-weight: 700;
  border-radius: 8px;
}
.details td {
  background: var(--c-fond);
  padding: 1rem 1.25rem;
}
.bloc-details {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
.bloc-details h3 {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  color: var(--c-primaire-fonce);
}
.admins {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.3rem;
  font-size: 0.9rem;
}
.case {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.35rem 0;
  font-weight: 600;
}
.case input {
  width: 20px;
  height: 20px;
  accent-color: var(--c-primaire);
}
</style>
