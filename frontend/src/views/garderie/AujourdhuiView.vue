<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import type { EnfantDuJour, Entree, Groupe, Presence, TypeEntree, VueJour } from '@/api/types'
import AvatarEnfant from '@/components/AvatarEnfant.vue'
import FormulaireEntree from '@/components/FormulaireEntree.vue'
import IconeEntree from '@/components/IconeEntree.vue'
import ListeDemarrage from '@/components/ListeDemarrage.vue'
import NavigationDate from '@/components/NavigationDate.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { decrireEntree, formaterDateLongue, formaterDuree, formaterHeure, PRESENCES, TYPES } from '@/utils/format'

const auth = useAuthStore()
const notif = useNotificationsStore()
const groupes = ref<Groupe[]>([])
const groupeId = ref<number | null>(Number(localStorage.getItem('garderie2027.groupe')) || null)
const vue = ref<VueJour | null>(null)
const date = ref<string | undefined>()
const filtre = ref<Presence | 'TOUS'>('TOUS')
const recherche = ref('')
const selection = ref<number[]>([])
const formulaire = ref<{ type?: TypeEntree; ids: number[] } | null>(null)
const occupe = ref(false)

const enfants = computed(() => vue.value?.enfants ?? [])
const compte = (p: Presence) => enfants.value.filter((e) => e.presence === p).length
const normaliser = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const visibles = computed(() =>
  enfants.value.filter(
    (e) =>
      (filtre.value === 'TOUS' || e.presence === filtre.value) &&
      normaliser(`${e.prenom} ${e.nom}`).includes(normaliser(recherche.value)),
  ),
)
const estAujourdhui = computed(() => !vue.value || vue.value.date === vue.value.aujourdhui)
const choisis = computed(() => enfants.value.filter((e) => selection.value.includes(e.id)))
const tousVisiblesChoisis = computed(
  () => visibles.value.length > 0 && visibles.value.every((e) => selection.value.includes(e.id)),
)

async function charger() {
  try {
    const q = new URLSearchParams()
    if (groupeId.value) q.set('groupeId', String(groupeId.value))
    if (date.value) q.set('date', date.value)
    vue.value = await api<VueJour>(`/journal/jour?${q}`)
    selection.value = selection.value.filter((id) => enfants.value.some((e) => e.id === id))
  } catch (e) {
    notif.erreur(e)
  }
}

let minuteur: ReturnType<typeof setInterval> | undefined
onMounted(async () => {
  groupes.value = await api<Groupe[]>('/groupes').catch(() => [])
  if (groupeId.value && !groupes.value.some((g) => g.id === groupeId.value)) groupeId.value = null
  await charger()
  // Actualisation automatique : plusieurs éducatrices travaillent en même temps.
  minuteur = setInterval(() => !document.hidden && !formulaire.value && estAujourdhui.value && charger(), 60_000)
})
onUnmounted(() => clearInterval(minuteur))

watch(groupeId, (g) => {
  localStorage.setItem('garderie2027.groupe', g ? String(g) : '')
  selection.value = []
  charger()
})

function changerDate(d: string) {
  date.value = d
  selection.value = []
  charger()
}

const basculer = (id: number) =>
  (selection.value = selection.value.includes(id) ? selection.value.filter((x) => x !== id) : [...selection.value, id])
const basculerVisibles = () =>
  (selection.value = tousVisiblesChoisis.value
    ? selection.value.filter((id) => !visibles.value.some((e) => e.id === id))
    : [...new Set([...selection.value, ...visibles.value.map((e) => e.id)])])

const noms = (liste: { prenom: string }[]) =>
  liste.length === 1 ? liste[0]!.prenom : liste.length <= 3 ? liste.map((e) => e.prenom).join(', ') : `${liste.length} enfants`

/** Annule des entrées créées par erreur. */
const annulation = (ids: number[]) => ({
  libelle: 'Annuler',
  executer: async () => {
    await Promise.all(ids.map((id) => api(`/journal/${id}`, { method: 'DELETE' }))).catch(notif.erreur)
    notif.info('Action annulée.')
    charger()
  },
})

async function presence(liste: EnfantDuJour[], type: 'ARRIVEE' | 'DEPART') {
  const cibles = liste.filter((e) => (type === 'ARRIVEE' ? e.presence !== 'PRESENT' : e.presence === 'PRESENT'))
  if (!cibles.length)
    return notif.info(type === 'ARRIVEE' ? 'Ces enfants sont déjà présents.' : "Aucun de ces enfants n'est présent.")
  occupe.value = true
  try {
    const creees = await api<Entree[]>('/journal', {
      method: 'POST',
      body: { enfantIds: cibles.map((e) => e.id), type, donnees: {}, ...(date.value ? { date: date.value } : {}) },
    })
    notif.succes(
      `${type === 'ARRIVEE' ? 'Arrivée' : 'Départ'} de ${noms(cibles)} à ${formaterHeure(creees[0]?.heure)}.`,
      annulation(creees.map((e) => e.id)),
    )
    selection.value = []
    await charger()
  } catch (e) {
    notif.erreur(e)
  } finally {
    occupe.value = false
  }
}

async function reveil(liste: EnfantDuJour[]) {
  const enSieste = liste.filter((e) => e.siesteEnCours)
  if (!enSieste.length) return notif.info("Aucun de ces enfants n'est en sieste.")
  occupe.value = true
  try {
    await Promise.all(enSieste.map((e) => api(`/journal/${e.siesteEnCours!.id}/terminer-sieste`, { method: 'POST', body: {} })))
    notif.succes(`Fin de sieste pour ${noms(enSieste)}.`)
    selection.value = []
    await charger()
  } catch (e) {
    notif.erreur(e)
  } finally {
    occupe.value = false
  }
}

function enregistre(message: string, ids: number[]) {
  formulaire.value = null
  selection.value = []
  notif.succes(message, ids.length ? annulation(ids) : undefined)
  charger()
}

const ouvrir = (type: TypeEntree | undefined, ids: number[]) => (formulaire.value = { type, ids })
</script>

<template>
  <div class="conteneur avec-barre">
    <ListeDemarrage v-if="auth.estAdmin" />

    <div class="entete-page">
      <div>
        <h1>{{ estAujourdhui ? "Aujourd'hui" : 'Journée passée' }}</h1>
        <span class="doux">{{ vue ? formaterDateLongue(vue.date) : '' }}</span>
      </div>
      <NavigationDate v-if="vue" :date="vue.date" :aujourdhui="vue.aujourdhui" @changer="changerDate" />
    </div>

    <div class="collant">
      <div v-if="groupes.length > 1" class="puces" style="margin-bottom: 0.75rem">
        <button class="puce" :class="{ actif: !groupeId }" @click="groupeId = null">Tous les groupes</button>
        <button v-for="g in groupes" :key="g.id" class="puce" :class="{ actif: groupeId === g.id }" @click="groupeId = g.id">
          <span class="point" :style="{ background: g.couleur ?? 'var(--c-bord)' }" />{{ g.nom }}
        </button>
      </div>

      <div class="compteurs">
        <button :class="{ actif: filtre === 'TOUS' }" @click="filtre = 'TOUS'">
          <strong>{{ enfants.length }}</strong><span>Tous</span>
        </button>
        <button class="present" :class="{ actif: filtre === 'PRESENT' }" @click="filtre = 'PRESENT'">
          <strong>{{ compte('PRESENT') }}</strong><span>Présents</span>
        </button>
        <button class="absent" :class="{ actif: filtre === 'ABSENT' }" @click="filtre = 'ABSENT'">
          <strong>{{ compte('ABSENT') }}</strong><span>Pas arrivés</span>
        </button>
        <button class="parti" :class="{ actif: filtre === 'PARTI' }" @click="filtre = 'PARTI'">
          <strong>{{ compte('PARTI') }}</strong><span>Partis</span>
        </button>
      </div>

      <div v-if="!estAujourdhui" class="alerte avert">
        Vous consultez une journée passée : les entrées ajoutées seront datées de ce jour.
        <button class="btn lien petit" @click="changerDate(vue!.aujourdhui)">Revenir à aujourd'hui</button>
      </div>

      <div class="rangee">
        <input v-if="enfants.length > 6" v-model="recherche" type="search" placeholder="Rechercher un enfant…" class="recherche" />
        <span v-else class="doux petit espace">Astuce : cochez plusieurs enfants pour tout noter en une seule fois.</span>
        <button v-if="visibles.length" class="btn secondaire petit" @click="basculerVisibles">
          {{ tousVisiblesChoisis ? 'Tout désélectionner' : 'Tout sélectionner' }}
        </button>
        <button class="btn" :disabled="!enfants.length" @click="ouvrir(undefined, selection)">+ Nouvelle entrée</button>
      </div>
    </div>

    <div v-if="vue && !enfants.length" class="vide carte">
      <p>Aucun enfant actif{{ groupeId ? ' dans ce groupe' : '' }}.</p>
      <RouterLink to="/garderie/enfants/nouveau" class="btn">Inscrire un enfant</RouterLink>
    </div>
    <div v-else-if="vue && !visibles.length" class="vide">Aucun enfant ne correspond à ce filtre.</div>
    <div v-else-if="!vue" class="grille" aria-busy="true">
      <div v-for="i in 6" :key="i" class="squelette carte" />
    </div>

    <div class="grille">
      <article
        v-for="e in visibles"
        :key="e.id"
        class="carte enfant"
        :class="[e.presence.toLowerCase(), { choisi: selection.includes(e.id) }]"
        :style="{ borderLeftColor: e.groupe?.couleur ?? 'var(--c-bord)' }"
      >
        <div class="haut" @click="basculer(e.id)">
          <span class="case-choix" :class="{ coche: selection.includes(e.id) }" role="checkbox" :aria-checked="selection.includes(e.id)" :aria-label="`Sélectionner ${e.prenom}`">
            <svg v-if="selection.includes(e.id)" viewBox="0 0 24 24" width="16" height="16"><path d="M5 12l5 5L20 7" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" /></svg>
          </span>
          <AvatarEnfant :personne="e" :couleur="e.groupe?.couleur" />
          <div class="nom">
            <strong>{{ e.prenom }} {{ e.nom }}</strong>
            <small class="doux">{{ e.groupe?.nom ?? 'Sans groupe' }}</small>
          </div>
          <span class="espace" />
          <span class="badge" :class="{ vert: e.presence === 'PRESENT' }">{{ PRESENCES[e.presence] }}</span>
        </div>

        <div v-if="e.allergies" class="allergie petit">Allergies : {{ e.allergies }}</div>

        <div v-if="e.siesteEnCours" class="sieste rangee">
          <IconeEntree type="SIESTE" :taille="28" />
          <span class="petit">Dort depuis <strong>{{ formaterHeure(e.siesteEnCours.debut) }}</strong></span>
          <span class="espace" />
          <button class="btn petit" :disabled="occupe" @click="reveil([e])">Réveil</button>
        </div>
        <div v-else-if="e.derniereEntree" class="derniere petit">
          <IconeEntree :type="e.derniereEntree.type" :taille="24" />
          <span>
            <strong>{{ formaterHeure(e.derniereEntree.heure) }}</strong> · {{ TYPES[e.derniereEntree.type] }}
            <span class="doux">{{ decrireEntree(e.derniereEntree.type, e.derniereEntree.donnees) }}</span>
          </span>
        </div>

        <div class="infos petit doux">
          <span>Arrivée {{ formaterHeure(e.resume.arrivee) }}</span>
          <span>Repas {{ e.resume.repas.length }}</span>
          <span>Sieste {{ e.resume.siesteMinutes ? formaterDuree(e.resume.siesteMinutes) : '—' }}</span>
          <span>Photos {{ e.resume.nombrePhotos }}</span>
        </div>

        <div class="actions">
          <button v-if="e.presence !== 'PRESENT'" class="btn petit" :disabled="occupe" @click="presence([e], 'ARRIVEE')">Arrivée</button>
          <button v-else class="btn secondaire petit" :disabled="occupe" @click="presence([e], 'DEPART')">Départ</button>
          <button class="btn secondaire petit" @click="ouvrir('REPAS', [e.id])">Repas</button>
          <button v-if="!e.siesteEnCours" class="btn secondaire petit" @click="ouvrir('SIESTE', [e.id])">Sieste</button>
          <button class="btn secondaire petit" @click="ouvrir(undefined, [e.id])">Autre…</button>
          <RouterLink :to="`/garderie/enfants/${e.id}`" class="btn lien petit">Journal ›</RouterLink>
        </div>
      </article>
    </div>

    <!-- Barre d'actions groupées -->
    <Transition name="glisse">
      <div v-if="selection.length" class="barre-groupee">
        <div class="interieur">
          <div class="rangee">
            <strong>{{ selection.length }} sélectionné(s)</strong>
            <span class="doux petit">{{ noms(choisis) }}</span>
            <span class="espace" />
            <button class="btn lien petit" @click="selection = []">Effacer</button>
          </div>
          <div class="boutons">
            <button class="btn petit" :disabled="occupe" @click="presence(choisis, 'ARRIVEE')">Arrivée</button>
            <button class="btn secondaire petit" :disabled="occupe" @click="presence(choisis, 'DEPART')">Départ</button>
            <button class="btn secondaire petit" @click="ouvrir('REPAS', selection)">Repas</button>
            <button class="btn secondaire petit" @click="ouvrir('SIESTE', selection)">Sieste</button>
            <button v-if="choisis.some((e) => e.siesteEnCours)" class="btn secondaire petit" :disabled="occupe" @click="reveil(choisis)">Réveil</button>
            <button class="btn secondaire petit" @click="ouvrir('ACTIVITE', selection)">Activité</button>
            <button
              class="btn secondaire petit btn-pro"
              :title="!auth.aFonctionnalite('photos') ? 'Fonctionnalité Pro' : undefined"
              @click="ouvrir('PHOTO', selection)"
            >
              Photo<span v-if="!auth.aFonctionnalite('photos')" class="badge-pro">Pro</span>
            </button>
            <button class="btn secondaire petit" @click="ouvrir('REMARQUE', selection)">Remarque</button>
            <button class="btn secondaire petit" @click="ouvrir(undefined, selection)">Autre…</button>
          </div>
        </div>
      </div>
    </Transition>

    <FormulaireEntree
      v-if="formulaire"
      :enfants="enfants"
      :selection="formulaire.ids"
      :type-initial="formulaire.type"
      :date="estAujourdhui ? undefined : vue?.date"
      @fermer="formulaire = null"
      @enregistre="enregistre"
    />
  </div>
</template>

<style scoped>
.avec-barre {
  padding-bottom: 7.5rem;
}
.point {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 0.4rem;
}
.compteurs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.6rem;
  margin-bottom: 0.75rem;
}
.compteurs button {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #fff;
  border: 1.5px solid var(--c-bord);
  border-radius: 14px;
  padding: 0.6rem 0.25rem;
  font: inherit;
  cursor: pointer;
  color: inherit;
  transition:
    border-color 0.15s,
    background 0.15s,
    transform 0.1s;
}
.compteurs button:hover {
  border-color: var(--c-primaire);
}
.compteurs button:active {
  transform: scale(0.97);
}
.compteurs strong {
  font-size: 1.5rem;
  line-height: 1.1;
  font-weight: 900;
}
.compteurs span {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--c-texte-doux);
}
.compteurs .present strong {
  color: var(--c-succes);
}
.compteurs .absent strong {
  color: var(--c-avert);
}
.compteurs .parti strong {
  color: var(--c-texte-doux);
}
.compteurs button.actif {
  border-color: var(--c-primaire);
  background: var(--c-primaire-clair);
}
.recherche {
  flex: 1;
  min-width: 170px;
}
.enfant {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  border-left: 5px solid var(--c-bord);
  transition:
    outline 0.1s,
    transform 0.15s ease,
    box-shadow 0.15s ease;
}
.enfant:hover {
  transform: translateY(-2px);
  box-shadow: var(--ombre-forte);
}
.enfant.parti {
  opacity: 0.75;
}
.enfant.choisi {
  outline: 2.5px solid var(--c-primaire);
  background: #faf8ff;
}
.haut {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  user-select: none;
}
.case-choix {
  width: 26px;
  height: 26px;
  border: 2px solid var(--c-bord);
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #fff;
  transition:
    background 0.12s,
    border-color 0.12s;
}
.haut:hover .case-choix {
  border-color: var(--c-primaire);
}
.case-choix.coche {
  background: var(--c-primaire);
  border-color: var(--c-primaire);
}
.nom {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.allergie {
  background: var(--c-danger-clair);
  color: var(--c-danger);
  border-radius: 10px;
  padding: 0.4rem 0.65rem;
  font-weight: 700;
}
.sieste {
  background: #eceaff;
  border-radius: 12px;
  padding: 0.5rem 0.65rem;
  flex-wrap: nowrap;
}
.derniere {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  background: var(--c-fond);
  border-radius: 12px;
  padding: 0.5rem 0.65rem;
}
.infos {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.9rem;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}
.barre-groupee {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 1rem;
  z-index: 30;
  width: min(960px, calc(100% - 1.5rem));
  background: #2b2640;
  border-radius: 18px;
  box-shadow: 0 16px 48px rgb(20 14 40 / 0.4);
  color: #fff;
}
.barre-groupee .interieur {
  padding: 0.6rem 1rem 0.8rem;
}
.barre-groupee .doux {
  color: #b8b3d4;
}
.barre-groupee .btn.secondaire {
  background: rgb(255 255 255 / 0.12);
  border-color: transparent;
  color: #fff;
}
.barre-groupee .btn.secondaire:hover {
  background: rgb(255 255 255 / 0.22);
}
.barre-groupee .btn.lien {
  color: #cfc9ea;
}
.boutons {
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  padding-top: 0.45rem;
  scrollbar-width: none;
}
.boutons::-webkit-scrollbar {
  display: none;
}
.boutons .btn {
  white-space: nowrap;
}
.glisse-enter-active,
.glisse-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.glisse-enter-from,
.glisse-leave-to {
  transform: translateX(-50%) translateY(120%);
  opacity: 0;
}
@media (max-width: 699px) {
  .barre-groupee {
    bottom: 4.6rem;
    width: calc(100% - 1rem);
  }
}
@media (min-width: 700px) and (max-width: 1099px) {
  .barre-groupee {
    left: calc(50% + 41px);
  }
}
@media (min-width: 1100px) {
  .barre-groupee {
    left: calc(50% + 124px);
  }
}
</style>
