<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import type { EnfantDuJour, Entree, TypeEntree } from '@/api/types'
import { useNotificationsStore } from '@/stores/notifications'
import { formaterDuree, formaterHeure, HUMEURS, MOMENTS, QUANTITES } from '@/utils/format'
import AvatarEnfant from './AvatarEnfant.vue'

const props = defineProps<{ enfants: EnfantDuJour[]; date?: string }>()
const emit = defineEmits<{ actualiser: []; ouvrir: [type: TypeEntree | undefined, ids: number[]] }>()
const notif = useNotificationsStore()

const MOMENTS_COURTS: Record<string, string> = {
  DEJEUNER: 'Déjeuner',
  COLLATION_AM: 'Coll. matin',
  DINER: 'Dîner',
  COLLATION_PM: 'Coll. après-midi',
  SOUPER: 'Souper',
}
const QUANTITES_COURTES: [string, string][] = [
  ['TOUT', 'Tout'],
  ['BIEN', 'Bien'],
  ['UN_PEU', 'Peu'],
  ['RIEN', 'Rien'],
]
const DETAILS_HYGIENE: [string, string][] = [
  ['MOUILLEE', 'Mouillée'],
  ['SELLE', 'Selle'],
  ['SECHE', 'Sèche'],
]

function momentProbable() {
  const h = new Date().getHours() + new Date().getMinutes() / 60
  return h < 9.5 ? 'DEJEUNER' : h < 11 ? 'COLLATION_AM' : h < 13.5 ? 'DINER' : h < 17 ? 'COLLATION_PM' : 'SOUPER'
}

const moment = ref(momentProbable())
const menu = ref('')
const genreHygiene = ref<'COUCHE' | 'TOILETTE'>('COUCHE')
const enCours = ref(new Set<string>())

const presents = computed(() => props.enfants.filter((e) => e.presence === 'PRESENT'))
const repasDe = (e: EnfantDuJour) => e.resume.repas.find((r) => r.moment === moment.value)
const presentsSansRepas = computed(() => presents.value.filter((e) => !repasDe(e)))
const presentsEveilles = computed(() => presents.value.filter((e) => !e.siesteEnCours))
const servis = computed(() => presents.value.length - presentsSansRepas.value.length)

const occupe = (cle: string) => enCours.value.has(cle)
async function avec(cle: string, action: () => Promise<void>) {
  if (enCours.value.has(cle)) return
  enCours.value = new Set(enCours.value).add(cle)
  try {
    await action()
    emit('actualiser')
  } catch (e) {
    notif.erreur(e)
  } finally {
    const s = new Set(enCours.value)
    s.delete(cle)
    enCours.value = s
  }
}

const annulation = (ids: number[]) => ({
  libelle: 'Annuler',
  executer: async () => {
    await Promise.all(ids.map((id) => api(`/journal/${id}`, { method: 'DELETE' }))).catch(notif.erreur)
    notif.info('Action annulée.')
    emit('actualiser')
  },
})

const creer = (enfantIds: number[], type: TypeEntree, donnees: Record<string, string>) =>
  api<Entree[]>('/journal', {
    method: 'POST',
    body: { enfantIds, type, donnees, ...(props.date ? { date: props.date } : {}) },
  })

const prenoms = (liste: EnfantDuJour[]) =>
  liste.length === 1 ? liste[0]!.prenom : liste.length <= 3 ? liste.map((e) => e.prenom).join(', ') : `${liste.length} enfants`

function presence(e: EnfantDuJour, type: 'ARRIVEE' | 'DEPART') {
  return avec(`${e.id}-presence`, async () => {
    const [c] = await creer([e.id], type, {})
    notif.succes(`${type === 'ARRIVEE' ? 'Arrivée' : 'Départ'} de ${e.prenom} à ${formaterHeure(c?.heure)}.`, annulation(c ? [c.id] : []))
  })
}

function repas(e: EnfantDuJour, quantite: string) {
  const existant = repasDe(e)
  if (existant?.quantite === quantite) return
  return avec(`${e.id}-repas`, async () => {
    if (existant) {
      await api(`/journal/${existant.id}`, {
        method: 'PATCH',
        body: { donnees: { moment: moment.value, quantite, ...(existant.menu ? { menu: existant.menu } : {}) } },
      })
      notif.succes(`${MOMENTS[moment.value]} de ${e.prenom} corrigé : ${QUANTITES[quantite]}.`)
    } else {
      const creees = await creer([e.id], 'REPAS', { moment: moment.value, quantite, ...(menu.value.trim() ? { menu: menu.value.trim() } : {}) })
      notif.succes(`${MOMENTS[moment.value]} de ${e.prenom} : ${QUANTITES[quantite]}.`, annulation(creees.map((c) => c.id)))
    }
  })
}

function repasPourTous(quantite: string) {
  const cibles = presentsSansRepas.value
  if (!cibles.length) return notif.info('Tous les enfants présents ont déjà ce repas.')
  return avec('tous-repas', async () => {
    const creees = await creer(
      cibles.map((e) => e.id),
      'REPAS',
      { moment: moment.value, quantite, ...(menu.value.trim() ? { menu: menu.value.trim() } : {}) },
    )
    notif.succes(`${MOMENTS[moment.value]} « ${QUANTITES[quantite]} » pour ${prenoms(cibles)}.`, annulation(creees.map((c) => c.id)))
  })
}

const maintenant = () => new Date().toTimeString().slice(0, 5)

function dodo(liste: EnfantDuJour[], cle: string) {
  const cibles = liste.filter((e) => !e.siesteEnCours)
  if (!cibles.length) return
  return avec(cle, async () => {
    const creees = await creer(
      cibles.map((e) => e.id),
      'SIESTE',
      { debut: maintenant() },
    )
    notif.succes(`Sieste commencée pour ${prenoms(cibles)}.`, annulation(creees.map((c) => c.id)))
  })
}

function reveil(e: EnfantDuJour) {
  return avec(`${e.id}-sieste`, async () => {
    await api(`/journal/${e.siesteEnCours!.id}/terminer-sieste`, { method: 'POST', body: {} })
    notif.succes(`${e.prenom} est réveillé(e).`)
  })
}

function hygiene(e: EnfantDuJour, detail: string) {
  return avec(`${e.id}-hygiene`, async () => {
    const creees = await creer([e.id], 'HYGIENE', { genre: genreHygiene.value, detail })
    notif.succes(
      `${genreHygiene.value === 'COUCHE' ? 'Couche' : 'Toilette'} (${detail === 'MOUILLEE' ? 'mouillée' : detail === 'SELLE' ? 'selle' : 'sèche'}) pour ${e.prenom}.`,
      annulation(creees.map((c) => c.id)),
    )
  })
}

function humeur(e: EnfantDuJour, ev: Event) {
  const valeur = (ev.target as HTMLSelectElement).value
  if (!valeur || valeur === e.resume.humeur) return
  return avec(`${e.id}-humeur`, async () => {
    if (e.resume.humeurId) await api(`/journal/${e.resume.humeurId}`, { method: 'PATCH', body: { donnees: { humeur: valeur } } })
    else await creer([e.id], 'HUMEUR', { humeur: valeur })
    notif.succes(`Humeur de ${e.prenom} : ${HUMEURS[valeur]}.`)
  })
}
</script>

<template>
  <div class="grille-saisie">
    <!-- Barre d'outils : contexte partagé par toutes les lignes -->
    <div class="outils">
      <div class="outil">
        <span class="etiquette">Repas</span>
        <div class="segment" role="radiogroup" aria-label="Moment du repas">
          <button
            v-for="(l, k) in MOMENTS_COURTS"
            :key="k"
            type="button"
            role="radio"
            :aria-checked="moment === k"
            :class="{ actif: moment === k }"
            @click="moment = k"
          >
            {{ l }}
          </button>
        </div>
      </div>
      <div class="outil menu">
        <span class="etiquette">Menu</span>
        <input v-model="menu" placeholder="Facultatif — ex. : pâtes, brocoli" maxlength="255" />
      </div>
      <div class="outil">
        <span class="etiquette">Hygiène</span>
        <div class="segment">
          <button type="button" :class="{ actif: genreHygiene === 'COUCHE' }" @click="genreHygiene = 'COUCHE'">Couche</button>
          <button type="button" :class="{ actif: genreHygiene === 'TOILETTE' }" @click="genreHygiene = 'TOILETTE'">Toilette</button>
        </div>
      </div>
    </div>

    <div class="tableau-saisie" role="table" aria-label="Saisie rapide">
      <div class="ligne entete" role="row">
        <div role="columnheader">Enfant</div>
        <div role="columnheader">Présence</div>
        <div role="columnheader">{{ MOMENTS[moment] }} <span class="compte">{{ servis }}/{{ presents.length }}</span></div>
        <div role="columnheader">Sieste</div>
        <div role="columnheader">{{ genreHygiene === 'COUCHE' ? 'Couche' : 'Toilette' }}</div>
        <div role="columnheader">Humeur</div>
        <div role="columnheader" />
      </div>

      <!-- Ligne « tous les présents » -->
      <div v-if="presents.length > 1" class="ligne tous" role="row">
        <div class="cellule-enfant">
          <span class="pastille-tous">{{ presents.length }}</span>
          <div class="nom-enfant">
            <strong>Tous les présents</strong>
            <small>Appliquer à ceux qui n'ont rien</small>
          </div>
        </div>
        <div class="cellule" data-libelle="Présence" />
        <div class="cellule" :data-libelle="MOMENTS[moment]">
          <div class="choix-quantite">
            <button
              v-for="[k, l] in QUANTITES_COURTES"
              :key="k"
              type="button"
              :class="`q-${k.toLowerCase()}`"
              :disabled="!presentsSansRepas.length || occupe('tous-repas')"
              :title="`${QUANTITES[k]} — ${presentsSansRepas.length} enfant(s)`"
              @click="repasPourTous(k)"
            >
              {{ l }}
            </button>
          </div>
        </div>
        <div class="cellule" data-libelle="Sieste">
          <button
            type="button"
            class="action"
            :disabled="!presentsEveilles.length || occupe('tous-sieste')"
            @click="dodo(presentsEveilles, 'tous-sieste')"
          >
            Tous à la sieste
          </button>
        </div>
        <div class="cellule masque-mobile" />
        <div class="cellule masque-mobile" />
        <div class="cellule masque-mobile" />
      </div>

      <div
        v-for="e in enfants"
        :key="e.id"
        class="ligne"
        :class="{ inactif: e.presence !== 'PRESENT' }"
        role="row"
      >
        <div class="cellule-enfant">
          <AvatarEnfant :personne="e" :couleur="e.groupe?.couleur" :taille="34" />
          <div class="nom-enfant">
            <RouterLink :to="`/garderie/enfants/${e.id}`">{{ e.prenom }} {{ e.nom }}</RouterLink>
            <small>
              <span v-if="e.allergies" class="allergie" :title="`Allergies : ${e.allergies}`">Allergies</span>
              {{ e.groupe?.nom ?? 'Sans groupe' }}
            </small>
          </div>
        </div>

        <div class="cellule" data-libelle="Présence">
          <button v-if="e.presence === 'ABSENT'" type="button" class="action primaire" :disabled="occupe(`${e.id}-presence`)" @click="presence(e, 'ARRIVEE')">
            Arrivée
          </button>
          <div v-else-if="e.presence === 'PRESENT'" class="presence">
            <span class="etat present">{{ formaterHeure(e.resume.arrivee) }}</span>
            <button type="button" class="action discret" :disabled="occupe(`${e.id}-presence`)" @click="presence(e, 'DEPART')">Départ</button>
          </div>
          <span v-else class="etat parti">Parti · {{ formaterHeure(e.resume.depart) }}</span>
        </div>

        <div class="cellule" :data-libelle="MOMENTS[moment]">
          <div class="choix-quantite" :class="{ rempli: repasDe(e) }">
            <button
              v-for="[k, l] in QUANTITES_COURTES"
              :key="k"
              type="button"
              :class="[`q-${k.toLowerCase()}`, { actif: repasDe(e)?.quantite === k }]"
              :aria-pressed="repasDe(e)?.quantite === k"
              :title="QUANTITES[k]"
              :disabled="e.presence !== 'PRESENT' || occupe(`${e.id}-repas`)"
              @click="repas(e, k)"
            >
              {{ l }}
            </button>
          </div>
        </div>

        <div class="cellule" data-libelle="Sieste">
          <div v-if="e.siesteEnCours" class="presence">
            <span class="etat dort">Dort · {{ formaterHeure(e.siesteEnCours.debut) }}</span>
            <button type="button" class="action primaire" :disabled="occupe(`${e.id}-sieste`)" @click="reveil(e)">Réveil</button>
          </div>
          <div v-else class="presence">
            <button
              type="button"
              class="action"
              :disabled="e.presence !== 'PRESENT' || occupe(`${e.id}-sieste`)"
              @click="dodo([e], `${e.id}-sieste`)"
            >
              Dodo
            </button>
            <span v-if="e.resume.siesteMinutes" class="info">{{ formaterDuree(e.resume.siesteMinutes) }}</span>
          </div>
        </div>

        <div class="cellule" :data-libelle="genreHygiene === 'COUCHE' ? 'Couche' : 'Toilette'">
          <div class="presence">
            <div class="choix-hygiene">
              <button
                v-for="[k, l] in DETAILS_HYGIENE"
                :key="k"
                type="button"
                :disabled="e.presence !== 'PRESENT' || occupe(`${e.id}-hygiene`)"
                @click="hygiene(e, k)"
              >
                {{ l }}
              </button>
            </div>
            <span v-if="e.resume.nombreHygiene" class="info" :title="`Dernier change : ${formaterHeure(e.resume.derniereHygiene)}`">
              {{ e.resume.nombreHygiene }}× · {{ formaterHeure(e.resume.derniereHygiene) }}
            </span>
          </div>
        </div>

        <div class="cellule" data-libelle="Humeur">
          <select
            class="choix-humeur"
            :class="{ rempli: e.resume.humeur }"
            :value="e.resume.humeur ?? ''"
            :disabled="e.presence === 'ABSENT' || occupe(`${e.id}-humeur`)"
            @change="humeur(e, $event)"
          >
            <option value="" disabled>—</option>
            <option v-for="(l, k) in HUMEURS" :key="k" :value="k">{{ l }}</option>
          </select>
        </div>

        <div class="cellule fin">
          <button type="button" class="action discret" title="Autre entrée (activité, remarque, photo…)" @click="emit('ouvrir', undefined, [e.id])">
            + Autre
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grille-saisie {
  background: #fff;
  border: 1px solid var(--c-bord);
  border-radius: var(--rayon);
  box-shadow: var(--ombre);
  overflow: hidden;
}

/* ---------- Barre d'outils ---------- */
.outils {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  align-items: flex-end;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--c-bord);
  background: var(--c-fond);
}
.outil {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}
.outil.menu {
  flex: 1;
  min-width: 200px;
}
.outil input {
  padding: 0.4rem 0.65rem;
  font-size: 0.9rem;
  min-height: 34px;
}
.etiquette {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--c-texte-doux);
}
.segment {
  display: inline-flex;
  background: #fff;
  border: 1px solid var(--c-bord-fort);
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
  overflow-x: auto;
  scrollbar-width: none;
  max-width: 100%;
}
.segment::-webkit-scrollbar {
  display: none;
}
.segment button {
  border: none;
  background: none;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--c-texte-doux);
  padding: 0.32rem 0.7rem;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}
.segment button:hover {
  color: var(--c-texte);
  background: var(--c-survol);
}
.segment button.actif {
  background: var(--c-primaire);
  color: #fff;
}

/* ---------- Tableau ---------- */
.ligne {
  display: grid;
  grid-template-columns: minmax(180px, 1.4fr) 150px 210px 160px minmax(190px, 1.1fr) 120px 80px;
  align-items: center;
  border-bottom: 1px solid var(--c-bord);
  min-height: 58px;
}
.ligne:last-child {
  border-bottom: none;
}
.ligne > div {
  padding: 0.5rem 0.6rem;
  min-width: 0;
}
.ligne > div:first-child {
  padding-left: 1rem;
}
.ligne:not(.entete):hover {
  background: #fbfcfe;
}
.entete {
  min-height: 0;
  background: #fff;
}
.entete > div {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--c-texte-doux);
  padding-top: 0.6rem;
  padding-bottom: 0.6rem;
}
.compte {
  margin-left: 0.3rem;
  color: var(--c-primaire);
  font-variant-numeric: tabular-nums;
}
.tous {
  background: var(--c-primaire-clair);
}
.tous:hover {
  background: #e6e9fe !important;
}
.pastille-tous {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--c-primaire);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.85rem;
  flex-shrink: 0;
}
.ligne.inactif .cellule-enfant {
  opacity: 0.6;
}

.cellule-enfant {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}
.nom-enfant {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}
.nom-enfant a,
.nom-enfant strong {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--c-texte);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nom-enfant a:hover {
  color: var(--c-primaire);
  text-decoration: underline;
}
.nom-enfant small {
  color: var(--c-texte-doux);
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  overflow: hidden;
  white-space: nowrap;
}
.allergie {
  background: var(--c-danger-clair);
  color: #b91c1c;
  border: 1px solid #fecaca;
  border-radius: 4px;
  padding: 0 0.3rem;
  font-size: 0.66rem;
  font-weight: 600;
  cursor: help;
}

/* ---------- Contrôles ---------- */
.action {
  border: 1px solid var(--c-bord-fort);
  background: #fff;
  color: var(--c-texte);
  font: inherit;
  font-size: 0.8rem;
  font-weight: 500;
  border-radius: 7px;
  padding: 0.3rem 0.65rem;
  min-height: 32px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.12s,
    border-color 0.12s;
}
.action:hover:not(:disabled) {
  background: var(--c-survol);
}
.action.primaire {
  background: var(--c-primaire);
  border-color: var(--c-primaire);
  color: #fff;
}
.action.primaire:hover:not(:disabled) {
  background: var(--c-primaire-fonce);
}
.action.discret {
  border-color: transparent;
  color: var(--c-texte-doux);
}
.action.discret:hover:not(:disabled) {
  color: var(--c-texte);
}
.action:disabled,
.choix-quantite button:disabled,
.choix-hygiene button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.presence {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.etat {
  font-size: 0.8rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  white-space: nowrap;
}
.etat::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}
.etat.present {
  color: #047857;
}
.etat.parti {
  color: var(--c-texte-doux);
}
.etat.dort {
  color: #4338ca;
}
.info {
  font-size: 0.75rem;
  color: var(--c-texte-doux);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.choix-quantite,
.choix-hygiene {
  display: inline-flex;
  border: 1px solid var(--c-bord-fort);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.choix-quantite button,
.choix-hygiene button {
  border: none;
  border-right: 1px solid var(--c-bord);
  background: none;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 500;
  color: #334155;
  padding: 0.35rem 0.55rem;
  min-height: 32px;
  cursor: pointer;
  transition:
    background 0.1s,
    color 0.1s;
}
.choix-quantite button:last-child,
.choix-hygiene button:last-child {
  border-right: none;
}
.choix-quantite button:hover:not(:disabled),
.choix-hygiene button:hover:not(:disabled) {
  background: var(--c-survol);
}
.choix-quantite.rempli button:not(.actif) {
  color: #94a3b8;
}
.choix-quantite button.actif.q-tout {
  background: #059669;
  color: #fff;
}
.choix-quantite button.actif.q-bien {
  background: #10b981;
  color: #fff;
}
.choix-quantite button.actif.q-un_peu {
  background: #f59e0b;
  color: #fff;
}
.choix-quantite button.actif.q-rien {
  background: #dc2626;
  color: #fff;
}

.choix-humeur {
  font-size: 0.82rem;
  padding: 0.3rem 0.5rem;
  min-height: 32px;
  color: var(--c-texte-doux);
}
.choix-humeur.rempli {
  color: var(--c-texte);
  font-weight: 500;
  border-color: #a5b4fc;
  background: var(--c-primaire-clair);
}
.cellule.fin {
  text-align: right;
  padding-right: 0.9rem;
}

/* ---------- Tablette : défilement horizontal ---------- */
@media (min-width: 700px) {
  .tableau-saisie {
    overflow-x: auto;
  }
  .ligne {
    min-width: 1090px;
  }
  .cellule-enfant {
    position: sticky;
    left: 0;
    background: inherit;
    z-index: 1;
  }
  .ligne:not(.tous):not(.entete) .cellule-enfant {
    background: #fff;
  }
  .ligne:not(.tous):not(.entete):hover .cellule-enfant {
    background: #fbfcfe;
  }
  .tous .cellule-enfant {
    background: var(--c-primaire-clair);
  }
}

/* ---------- Téléphone : une carte par enfant ---------- */
@media (max-width: 699px) {
  .outils {
    padding: 0.75rem;
  }
  .outil {
    width: 100%;
  }
  .entete {
    display: none;
  }
  .ligne {
    grid-template-columns: 1fr 1fr;
    gap: 0.15rem 0.5rem;
    padding: 0.75rem;
  }
  .ligne > div,
  .ligne > div:first-child {
    padding: 0.25rem 0;
  }
  .cellule-enfant {
    grid-column: 1 / -1;
    padding-bottom: 0.4rem !important;
  }
  .cellule::before {
    content: attr(data-libelle);
    display: block;
    font-size: 0.66rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--c-texte-doux);
    margin-bottom: 0.2rem;
  }
  .cellule[data-libelle=''],
  .cellule:not([data-libelle])::before {
    content: none;
  }
  /* Repas et hygiène : pleine largeur, boutons répartis */
  .cellule:nth-child(3),
  .cellule:nth-child(5) {
    grid-column: 1 / -1;
  }
  .choix-quantite,
  .choix-hygiene {
    display: flex;
    width: 100%;
  }
  .choix-quantite button,
  .choix-hygiene button {
    flex: 1;
    min-height: 40px;
    font-size: 0.85rem;
  }
  .choix-hygiene {
    flex: 1;
  }
  .action {
    min-height: 38px;
    padding: 0.4rem 0.8rem;
  }
  .choix-humeur {
    min-height: 38px;
  }
  .cellule.fin {
    text-align: left;
    align-self: end;
  }
  .masque-mobile,
  .tous .cellule[data-libelle='Présence'] {
    display: none;
  }
}
</style>
