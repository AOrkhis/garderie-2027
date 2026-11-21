<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { api } from '@/api/client'
import type { Entree, Photo, TypeEntree } from '@/api/types'
import {
  CATEGORIES,
  HUMEURS,
  HYGIENE_DETAILS,
  HYGIENE_GENRES,
  MOMENTS,
  QUALITES_SIESTE,
  QUANTITES,
  TYPES,
} from '@/utils/format'
import { useAuthStore } from '@/stores/auth'
import ChampHeure from './ChampHeure.vue'
import FenetreModale from './FenetreModale.vue'
import IconeEntree from './IconeEntree.vue'

interface EnfantChoix {
  id: number
  prenom: string
  nom: string
  consentementPhoto: boolean
}

const props = defineProps<{
  enfants: EnfantChoix[]
  selection?: number[]
  entree?: Entree
  typeInitial?: TypeEntree
  date?: string
}>()
const emit = defineEmits<{ fermer: []; enregistre: [message: string, ids: number[]] }>()

const auth = useAuthStore()
const TYPES_SAISIE: TypeEntree[] = ['ARRIVEE', 'DEPART', 'REPAS', 'SIESTE', 'ACTIVITE', 'HYGIENE', 'HUMEUR', 'REMARQUE', 'PHOTO']
const typesDisponibles = computed(() =>
  TYPES_SAISIE.filter((t) => t !== 'PHOTO' || auth.aFonctionnalite('photos')),
)
const REQUIS: Partial<Record<TypeEntree, [string, string][]>> = {
  REPAS: [['moment', 'le moment du repas']],
  SIESTE: [['debut', "l'heure de début de la sieste"]],
  HYGIENE: [['genre', 'le type (couche ou toilette)']],
  HUMEUR: [['humeur', "l'humeur"]],
}
const REMARQUES_RAPIDES = [
  'A passé une belle journée.',
  'A bien joué avec ses amis.',
  'Était un peu fatigué aujourd’hui.',
  'Merci d’apporter des vêtements de rechange.',
  'Merci d’apporter des couches.',
  'Merci d’apporter de la crème solaire.',
  'Petite chute sans gravité, tout va bien.',
  'Température un peu élevée : à surveiller.',
]
const ACTIVITES_RAPIDES: [string, string][] = [
  ['Peinture', 'ART'],
  ['Bricolage', 'ART'],
  ['Pâte à modeler', 'ART'],
  ['Jeux extérieurs', 'PLEIN_AIR'],
  ['Promenade', 'PLEIN_AIR'],
  ['Heure du conte', 'LECTURE'],
  ['Chansons et comptines', 'MUSIQUE'],
  ['Danse', 'MUSIQUE'],
  ['Parcours moteur', 'MOTRICITE'],
  ['Casse-têtes', 'JEU_LIBRE'],
  ['Expérience scientifique', 'SCIENCE'],
]
const CLE_MENUS = 'garderie2027.menus'

const maintenant = () => new Date().toTimeString().slice(0, 5)
function decaler(minutes: number) {
  const d = new Date(Date.now() - minutes * 60_000)
  heure.value = d.toTimeString().slice(0, 5)
}

const type = ref<TypeEntree>(props.entree?.type ?? props.typeInitial ?? 'REPAS')
const choisis = ref<number[]>(props.entree ? [props.entree.enfantId] : [...(props.selection ?? [])])
const heure = ref(props.entree?.heure ?? maintenant())
const d = reactive<Record<string, string>>({ ...props.entree?.donnees })
const quantites = reactive<Record<number, string>>({})
const fichiers = ref<File[]>([])
const photosExistantes = ref<Photo[]>(props.entree?.photos ?? [])
const erreur = ref('')
const envoi = ref(false)
const menusRecents = ref<string[]>(JSON.parse(localStorage.getItem(CLE_MENUS) ?? '[]'))

const accepteFichiers = computed(
  () => auth.aFonctionnalite('photos') && (type.value === 'ACTIVITE' || type.value === 'PHOTO'),
)
const enfantsChoisis = computed(() => props.enfants.filter((e) => choisis.value.includes(e.id)))
const sansConsentement = computed(() => enfantsChoisis.value.filter((e) => !e.consentementPhoto))
const repasParEnfant = computed(() => !props.entree && type.value === 'REPAS' && choisis.value.length > 1)
const tousChoisis = computed(() => choisis.value.length === props.enfants.length)

const apercus = ref<string[]>([])
watch(fichiers, (liste) => {
  apercus.value.forEach(URL.revokeObjectURL)
  apercus.value = liste.map((f) => URL.createObjectURL(f))
})
onUnmounted(() => apercus.value.forEach(URL.revokeObjectURL))

function choisirType(t: TypeEntree) {
  type.value = t
  for (const k of Object.keys(d)) delete d[k]
  if (t === 'SIESTE') d.debut = heure.value
  if (t === 'REMARQUE') d.importance = 'INFO'
  if (t === 'REPAS') d.moment = momentProbable()
}
function momentProbable() {
  const h = new Date().getHours() + new Date().getMinutes() / 60
  return h < 9.5 ? 'DEJEUNER' : h < 11 ? 'COLLATION_AM' : h < 13.5 ? 'DINER' : h < 17 ? 'COLLATION_PM' : 'SOUPER'
}
if (!props.entree) choisirType(type.value)

function basculer(id: number) {
  choisis.value = choisis.value.includes(id) ? choisis.value.filter((x) => x !== id) : [...choisis.value, id]
}
const basculerTous = () => (choisis.value = tousChoisis.value ? [] : props.enfants.map((e) => e.id))

function quantitePourTous(q: string) {
  d.quantite = q
  for (const id of choisis.value) quantites[id] = q
}

function ajouterRemarque(texte: string) {
  d.texte = d.texte ? `${d.texte.trimEnd()} ${texte}` : texte
}

function choisirActivite(titre: string, categorie: string) {
  d.titre = titre
  d.categorie = categorie
}

function surFichiers(e: Event) {
  fichiers.value = [...fichiers.value, ...((e.target as HTMLInputElement).files ?? [])].slice(0, 20)
  ;(e.target as HTMLInputElement).value = ''
}
const retirerFichier = (i: number) => (fichiers.value = fichiers.value.filter((_, j) => j !== i))
const retirerSansConsentement = () =>
  (choisis.value = choisis.value.filter((id) => !sansConsentement.value.some((e) => e.id === id)))

function memoriserMenu() {
  const menu = d.menu?.trim()
  if (!menu) return
  menusRecents.value = [menu, ...menusRecents.value.filter((m) => m !== menu)].slice(0, 8)
  localStorage.setItem(CLE_MENUS, JSON.stringify(menusRecents.value))
}

const libelleEnfants = () =>
  enfantsChoisis.value.length === 1 ? enfantsChoisis.value[0]!.prenom : `${enfantsChoisis.value.length} enfants`

async function enregistrer() {
  erreur.value = ''
  if (!heure.value) return (erreur.value = "Choisissez l'heure.")
  if (!choisis.value.length) return (erreur.value = 'Choisissez au moins un enfant.')
  const manquant = REQUIS[type.value]?.find(([cle]) => !d[cle])
  if (manquant) return (erreur.value = `Choisissez ${manquant[1]}.`)
  if (type.value === 'REPAS') {
    const sansQuantite = repasParEnfant.value
      ? enfantsChoisis.value.filter((e) => !quantites[e.id])
      : d.quantite
        ? []
        : enfantsChoisis.value
    if (sansQuantite.length)
      return (erreur.value = `Indiquez la quantité mangée pour : ${sansQuantite.map((e) => e.prenom).join(', ')}.`)
  }
  if (type.value === 'PHOTO' && !fichiers.value.length && !photosExistantes.value.length)
    return (erreur.value = 'Ajoutez au moins une photo.')
  if (fichiers.value.length && sansConsentement.value.length)
    return (erreur.value = `Pas de consentement photo pour : ${sansConsentement.value.map((e) => e.prenom).join(', ')}.`)

  envoi.value = true
  try {
    let photoIds = photosExistantes.value.map((p) => p.id)
    if (fichiers.value.length) {
      const fd = new FormData()
      fichiers.value.forEach((f) => fd.append('photos', f))
      fd.append('enfantIds', choisis.value.join(','))
      if (d.legende || d.titre) fd.append('legende', d.legende || d.titre!)
      const photos = await api<Photo[]>('/photos', { method: 'POST', body: fd })
      photoIds = [...photoIds, ...photos.map((p) => p.id)]
    }
    if (type.value === 'REPAS') memoriserMenu()

    if (props.entree) {
      await api(`/journal/${props.entree.id}`, { method: 'PATCH', body: { heure: heure.value, donnees: { ...d }, photoIds } })
      emit('enregistre', `${TYPES[type.value]} modifié(e).`, [])
      return
    }

    // Un repas pour plusieurs enfants : une requête par quantité mangée.
    const parQuantite = new Map<string, number[]>()
    if (repasParEnfant.value)
      for (const id of choisis.value) parQuantite.set(quantites[id]!, [...(parQuantite.get(quantites[id]!) ?? []), id])
    const lots = repasParEnfant.value
      ? [...parQuantite].map(([quantite, ids]) => ({ ids, donnees: { ...d, quantite } }))
      : [{ ids: choisis.value, donnees: { ...d } }]

    const ids: number[] = []
    for (const lot of lots) {
      const creees = await api<Entree[]>('/journal', {
        method: 'POST',
        body: {
          enfantIds: lot.ids,
          type: type.value,
          heure: heure.value,
          donnees: lot.donnees,
          ...(props.date ? { date: props.date } : {}),
          ...(photoIds.length ? { photoIds } : {}),
        },
      })
      ids.push(...creees.map((e) => e.id))
    }
    emit('enregistre', `${TYPES[type.value]} ajouté(e) pour ${libelleEnfants()}.`, ids)
  } catch (e) {
    erreur.value = (e as Error).message
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <FenetreModale :titre="entree ? `Modifier — ${TYPES[type]}` : 'Nouvelle entrée'" large @fermer="emit('fermer')">
    <form @submit.prevent="enregistrer">
      <template v-if="!entree">
        <div class="champ">
          <span>1. Que voulez-vous noter ?</span>
          <div class="types">
            <button v-for="t in typesDisponibles" :key="t" type="button" class="type" :class="{ actif: type === t }" @click="choisirType(t)">
              <IconeEntree :type="t" :taille="30" />
              {{ TYPES[t] }}
            </button>
          </div>
        </div>

        <div class="champ">
          <div class="rangee">
            <span>2. Pour qui ? ({{ choisis.length }})</span>
            <span class="espace" />
            <button v-if="enfants.length > 1" type="button" class="btn lien petit" @click="basculerTous">
              {{ tousChoisis ? 'Aucun' : 'Tout le monde' }}
            </button>
          </div>
          <div class="puces">
            <button v-for="e in enfants" :key="e.id" type="button" class="puce" :class="{ actif: choisis.includes(e.id) }" @click="basculer(e.id)">
              {{ e.prenom }} {{ e.nom.charAt(0) }}.
            </button>
          </div>
        </div>
      </template>

      <div class="champ">
        <span>{{ entree ? 'Heure' : '3. À quelle heure ?' }}</span>
        <div class="rangee">
          <ChampHeure v-model="heure" />
          <button type="button" class="puce" @click="heure = maintenant()">Maintenant</button>
          <button type="button" class="puce" @click="decaler(15)">Il y a 15 min</button>
          <button type="button" class="puce" @click="decaler(30)">Il y a 30 min</button>
        </div>
      </div>

      <!-- Arrivée / départ -->
      <template v-if="type === 'ARRIVEE' || type === 'DEPART'">
        <div class="champ">
          <span>{{ type === 'ARRIVEE' ? 'Déposé par' : 'Récupéré par' }}</span>
          <div class="puces" style="margin-bottom: 0.4rem">
            <button v-for="p in ['Maman', 'Papa', 'Grand-parent', 'Autre personne autorisée']" :key="p" type="button" class="puce" :class="{ actif: d.parQui === p }" @click="d.parQui = p">
              {{ p }}
            </button>
          </div>
          <input v-model="d.parQui" placeholder="Ou écrivez un nom…" maxlength="120" />
        </div>
        <label class="champ"><span>Remarque (facultatif)</span><textarea v-model="d.remarque" maxlength="1000" /></label>
      </template>

      <!-- Repas -->
      <template v-if="type === 'REPAS'">
        <div class="champ">
          <span>Moment</span>
          <div class="puces">
            <button v-for="(l, k) in MOMENTS" :key="k" type="button" class="puce" :class="{ actif: d.moment === k }" @click="d.moment = k">{{ l }}</button>
          </div>
        </div>
        <label class="champ">
          <span>Menu</span>
          <input v-model="d.menu" list="menus-recents" placeholder="Ex. : Pâtes, brocoli, compote" maxlength="255" />
          <datalist id="menus-recents"><option v-for="m in menusRecents" :key="m" :value="m" /></datalist>
          <small v-if="menusRecents.length">Astuce : les menus récents sont proposés pendant la saisie.</small>
        </label>
        <div class="champ">
          <span>{{ repasParEnfant ? 'Quantité mangée — appliquer à tous' : 'Quantité mangée' }}</span>
          <div class="puces">
            <button v-for="(l, k) in QUANTITES" :key="k" type="button" class="puce" :class="{ actif: d.quantite === k }" @click="quantitePourTous(k)">{{ l }}</button>
          </div>
        </div>
        <div v-if="repasParEnfant" class="champ">
          <span>Ajuster pour chaque enfant</span>
          <div class="par-enfant">
            <div v-for="e in enfantsChoisis" :key="e.id" class="ligne-enfant">
              <strong>{{ e.prenom }}</strong>
              <div class="puces">
                <button v-for="(l, k) in QUANTITES" :key="k" type="button" class="puce petite" :class="{ actif: quantites[e.id] === k }" @click="quantites[e.id] = k">{{ l }}</button>
              </div>
            </div>
          </div>
        </div>
        <label class="champ"><span>Commentaire (facultatif)</span><textarea v-model="d.commentaire" maxlength="1000" /></label>
      </template>

      <!-- Sieste -->
      <template v-if="type === 'SIESTE'">
        <div class="deux-colonnes">
          <div class="champ"><span>Début</span><ChampHeure v-model="d.debut" /></div>
          <div class="champ">
            <span>Fin</span>
            <ChampHeure v-model="d.fin" facultatif />
            <small>Laissez vide si l'enfant dort encore : un bouton « Réveil » apparaîtra sur sa carte.</small>
          </div>
        </div>
        <div class="champ">
          <span>Qualité</span>
          <div class="puces">
            <button v-for="(l, k) in QUALITES_SIESTE" :key="k" type="button" class="puce" :class="{ actif: d.qualite === k }" @click="d.qualite = k">{{ l }}</button>
          </div>
        </div>
        <label class="champ"><span>Commentaire (facultatif)</span><textarea v-model="d.commentaire" maxlength="1000" /></label>
      </template>

      <!-- Activité -->
      <template v-if="type === 'ACTIVITE'">
        <div class="champ">
          <span>Activité</span>
          <div class="puces" style="margin-bottom: 0.4rem">
            <button v-for="[t, c] in ACTIVITES_RAPIDES" :key="t" type="button" class="puce" :class="{ actif: d.titre === t }" @click="choisirActivite(t, c)">{{ t }}</button>
          </div>
          <input v-model="d.titre" required placeholder="Ou écrivez un titre…" maxlength="150" />
        </div>
        <div class="champ">
          <span>Catégorie</span>
          <div class="puces">
            <button v-for="(l, k) in CATEGORIES" :key="k" type="button" class="puce" :class="{ actif: d.categorie === k }" @click="d.categorie = k">{{ l }}</button>
          </div>
        </div>
        <label class="champ"><span>Description (facultatif)</span><textarea v-model="d.description" maxlength="2000" placeholder="Ce que les enfants ont fait, appris, aimé…" /></label>
      </template>

      <!-- Hygiène -->
      <template v-if="type === 'HYGIENE'">
        <div class="champ">
          <span>Type</span>
          <div class="puces">
            <button v-for="(l, k) in HYGIENE_GENRES" :key="k" type="button" class="puce" :class="{ actif: d.genre === k }" @click="d.genre = k">{{ l }}</button>
          </div>
        </div>
        <div class="champ">
          <span>Détail</span>
          <div class="puces">
            <button v-for="(l, k) in HYGIENE_DETAILS" :key="k" type="button" class="puce" :class="{ actif: d.detail === k }" @click="d.detail = k">{{ l }}</button>
          </div>
        </div>
        <label class="champ"><span>Remarque (facultatif)</span><textarea v-model="d.remarque" maxlength="1000" /></label>
      </template>

      <!-- Humeur -->
      <template v-if="type === 'HUMEUR'">
        <div class="champ">
          <span>Humeur</span>
          <div class="puces">
            <button v-for="(l, k) in HUMEURS" :key="k" type="button" class="puce" :class="{ actif: d.humeur === k }" @click="d.humeur = k">{{ l }}</button>
          </div>
        </div>
        <label class="champ"><span>Commentaire (facultatif)</span><textarea v-model="d.commentaire" maxlength="1000" /></label>
      </template>

      <!-- Remarque -->
      <template v-if="type === 'REMARQUE'">
        <div class="champ">
          <span>Phrases rapides</span>
          <div class="puces">
            <button v-for="r in REMARQUES_RAPIDES" :key="r" type="button" class="puce" @click="ajouterRemarque(r)">{{ r }}</button>
          </div>
        </div>
        <label class="champ"><span>Remarque</span><textarea v-model="d.texte" required maxlength="2000" /></label>
        <label class="case">
          <input type="checkbox" :checked="d.importance === 'IMPORTANT'" @change="d.importance = ($event.target as HTMLInputElement).checked ? 'IMPORTANT' : 'INFO'" />
          Importante : mise en évidence pour les parents
        </label>
      </template>

      <!-- Photos -->
      <template v-if="accepteFichiers">
        <label v-if="type === 'PHOTO'" class="champ"><span>Légende (facultatif)</span><input v-model="d.legende" maxlength="255" placeholder="Ex. : Sortie au parc" /></label>
        <div class="champ">
          <span>Photos {{ type === 'ACTIVITE' ? '(facultatif)' : '' }}</span>
          <label class="zone-photos">
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple @change="surFichiers" />
            <strong>+ Prendre ou choisir des photos</strong>
            <small class="doux">JPEG, PNG ou WebP — jusqu'à 20 photos</small>
          </label>
          <div v-if="apercus.length" class="apercus">
            <div v-for="(src, i) in apercus" :key="src" class="apercu">
              <img :src="src" alt="" />
              <button type="button" aria-label="Retirer" @click="retirerFichier(i)">✕</button>
            </div>
          </div>
        </div>
        <div v-if="photosExistantes.length" class="rangee petit doux" style="margin-bottom: 0.9rem">
          {{ photosExistantes.length }} photo(s) déjà jointe(s)
          <button type="button" class="btn lien petit" @click="photosExistantes = []">Retirer</button>
        </div>
        <div v-if="sansConsentement.length && (fichiers.length || type === 'PHOTO')" class="alerte avert petit rangee">
          <span>Pas de consentement photo pour : {{ sansConsentement.map((e) => e.prenom).join(', ') }}.</span>
          <button type="button" class="btn secondaire petit" @click="retirerSansConsentement">Les retirer de la sélection</button>
        </div>
      </template>

      <div v-if="erreur" class="alerte erreur">{{ erreur }}</div>

      <div class="rangee pied">
        <span class="espace" />
        <button type="button" class="btn secondaire" @click="emit('fermer')">Annuler</button>
        <button class="btn" :disabled="envoi">{{ envoi ? 'Enregistrement…' : entree ? 'Enregistrer' : `Enregistrer pour ${choisis.length} enfant(s)` }}</button>
      </div>
    </form>
  </FenetreModale>
</template>

<style scoped>
.types {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.5rem;
}
.type {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 0.7rem 0.25rem;
  border: 1.5px solid var(--c-bord);
  border-radius: 14px;
  background: #fff;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  color: inherit;
  transition:
    border-color 0.12s,
    background 0.12s,
    transform 0.1s;
}
.type:hover {
  border-color: var(--c-primaire);
}
.type:active {
  transform: scale(0.96);
}
.type.actif {
  border-color: var(--c-primaire);
  background: var(--c-primaire-clair);
  color: var(--c-primaire-fonce);
}
.par-enfant {
  border: 1.5px solid var(--c-bord);
  border-radius: 14px;
  max-height: 260px;
  overflow-y: auto;
}
.ligne-enfant {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.75rem;
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid var(--c-bord);
}
.ligne-enfant:last-child {
  border-bottom: none;
}
.ligne-enfant strong {
  min-width: 90px;
}
.puce.petite {
  padding: 0.25rem 0.6rem;
  font-size: 0.8rem;
}
.zone-photos {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  border: 2px dashed var(--c-bord);
  border-radius: 14px;
  padding: 1.25rem 1rem;
  cursor: pointer;
  color: var(--c-primaire);
  background: rgb(106 79 216 / 0.03);
}
.zone-photos:hover {
  border-color: var(--c-primaire);
}
.zone-photos input {
  display: none;
}
.apercus {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 0.4rem;
  margin-top: 0.5rem;
}
.apercu {
  position: relative;
  aspect-ratio: 1;
}
.apercu img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}
.apercu button {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgb(0 0 0 / 0.6);
  color: #fff;
  cursor: pointer;
  font-size: 0.75rem;
}
.pied {
  position: sticky;
  bottom: -1.25rem;
  background: #fff;
  padding: 0.75rem 0 0.25rem;
  margin-bottom: -0.25rem;
  border-top: 1px solid var(--c-bord);
}
</style>
