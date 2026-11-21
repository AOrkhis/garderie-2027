<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { AdminForfaits, GarderieAdmin, PlanGarderie } from '@/api/types'
import OngletsAdmin from '@/components/OngletsAdmin.vue'
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
const offre = ref<AdminForfaits | null>(null)
const dureeEssai = computed(() => offre.value?.parametres.dureeEssaiJours || 30)
const nomForfait = (code: string) => offre.value?.forfaits.find((f) => f.code === code)?.nom ?? code
const estPayant = (code: string) => (offre.value?.forfaits.find((f) => f.code === code)?.prixMensuel ?? 0) > 0

async function charger() {
  ;[garderies.value, catalogue.value, offre.value] = await Promise.all([
    api<GarderieAdmin[]>('/admin/garderies').catch((e) => ((erreur.value = e.message), [])),
    api<Fonctionnalite[]>('/admin/fonctionnalites').catch(() => []),
    api<AdminForfaits>('/admin/forfaits').catch(() => null),
  ])
}
onMounted(charger)

const enEssai = (g: GarderieAdmin) => !!g.essaiJusquau && new Date(g.essaiJusquau).getTime() > Date.now()

const totaux = computed(() => ({
  total: garderies.value.length,
  actives: garderies.value.filter((g) => g.statut === 'ACTIVE').length,
  payants: garderies.value.filter((g) => estPayant(g.plan)).length,
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
  await modifier(g, { plan }, `« ${g.nom} » passe au forfait ${nomForfait(plan)}.`)
}

/** Champ vide = revenir à la limite du forfait. */
async function changerLimite(g: GarderieAdmin, champ: 'maxEnfantsPerso' | 'maxPersonnelPerso', e: Event) {
  const brut = (e.target as HTMLInputElement).value.trim()
  const valeur = brut === '' ? null : Number(brut)
  if (valeur !== null && (!Number.isInteger(valeur) || valeur < 0)) return notif.erreur(new Error('Entrez un nombre entier positif.'))
  if (valeur === g[champ]) return
  await modifier(
    g,
    { [champ]: valeur },
    valeur === null ? 'Limite du forfait rétablie.' : `Limite fixée à ${valeur} ${champ === 'maxEnfantsPerso' ? 'enfants' : 'comptes du personnel'}.`,
  )
}
const plein = (n: number, max: number | null) => max !== null && n >= max

function prolongerEssai(g: GarderieAdmin) {
  const base = enEssai(g) ? new Date(g.essaiJusquau!).getTime() : Date.now()
  modifier(g, { essaiJusquau: new Date(base + dureeEssai.value * 24 * 3600 * 1000).toISOString() }, `Essai de « ${g.nom} » prolongé de ${dureeEssai.value} jours.`)
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
    <OngletsAdmin />
    <div v-if="erreur" class="alerte erreur">{{ erreur }}</div>

    <div v-if="garderies.length" class="resume">
      <div class="mini"><strong>{{ totaux.total }}</strong><small class="doux">garderies</small></div>
      <div class="mini"><strong>{{ totaux.actives }}</strong><small class="doux">actives</small></div>
      <div class="mini"><strong>{{ totaux.payants }}</strong><small class="doux">forfaits payants</small></div>
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
                  <option v-for="f in offre?.forfaits ?? []" :key="f.code" :value="f.code">{{ f.nom }}</option>
                  <option v-if="!offre?.forfaits.some((f) => f.code === g.plan)" :value="g.plan">{{ g.planNom }}</option>
                </select>
                <div class="petit" style="margin-top: 0.25rem">
                  <span v-if="enEssai(g)" class="badge orange">Essai jusqu'au {{ formaterDate(g.essaiJusquau!) }}</span>
                  <span
                    v-if="g.stripeAbonnementId"
                    class="badge"
                    :class="g.stripeStatut === 'past_due' || g.stripeStatut === 'unpaid' ? 'rouge' : 'vert'"
                    :title="`Abo ${g.stripeAbonnementId}`"
                  >Stripe {{ g.stripeStatut }}{{ g.payeJusquau ? ` · ${formaterDate(g.payeJusquau)}` : '' }}</span>
                  <button class="btn lien petit" style="padding: 0; min-height: 0" @click="prolongerEssai(g)">+{{ dureeEssai }} j d'essai</button>
                </div>
              </td>
              <td :class="{ depasse: plein(g.statistiques.enfants, g.limites.maxEnfants) }">
                {{ g.statistiques.enfants }}<small class="doux"> / {{ g.limites.maxEnfants ?? '∞' }}</small>
              </td>
              <td :class="{ depasse: plein(g.statistiques.personnel, g.limites.maxPersonnel) }">
                {{ g.statistiques.personnel }}<small class="doux"> / {{ g.limites.maxPersonnel ?? '∞' }}</small>
              </td>
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
                      <small v-if="g.fonctionnalitesPlan.includes(f.cle)" class="doux">— inclus dans {{ g.planEffectifNom }}</small>
                      <small v-else-if="(g.fonctionnalitesExtra ?? []).includes(f.cle)" class="badge vert">accordé</small>
                    </label>
                    <p v-if="!catalogue.length" class="doux petit">Aucune fonctionnalité payante pour l'instant.</p>
                  </div>
                  <div>
                    <h3>Limites</h3>
                    <label class="champ-limite">
                      <span>Enfants actifs max.</span>
                      <input
                        type="number"
                        min="0"
                        inputmode="numeric"
                        :value="g.maxEnfantsPerso ?? ''"
                        :placeholder="`Forfait : ${g.limites.maxEnfants ?? 'illimité'}`"
                        @change="changerLimite(g, 'maxEnfantsPerso', $event)"
                      />
                    </label>
                    <label class="champ-limite">
                      <span>Personnel max.</span>
                      <input
                        type="number"
                        min="0"
                        inputmode="numeric"
                        :value="g.maxPersonnelPerso ?? ''"
                        :placeholder="`Forfait : ${g.limites.maxPersonnel ?? 'illimité'}`"
                        @change="changerLimite(g, 'maxPersonnelPerso', $event)"
                      />
                    </label>
                    <p class="doux petit" style="margin: 0">Laissez vide pour utiliser la limite du forfait. Idéal pour le forfait Sur mesure.</p>
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
.depasse {
  color: var(--c-danger);
  font-weight: 600;
}
.champ-limite {
  display: grid;
  grid-template-columns: 1fr 130px;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
  font-size: 0.88rem;
}
.champ-limite input {
  padding: 0.35rem 0.6rem;
  font-size: 0.9rem;
  min-height: 34px;
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
