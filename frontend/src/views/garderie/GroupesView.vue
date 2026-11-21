<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '@/api/client'
import type { Groupe, MembrePersonnel, Reaffectation } from '@/api/types'
import FenetreModale from '@/components/FenetreModale.vue'
import { useNotificationsStore } from '@/stores/notifications'
import { formaterMois, formaterTranche } from '@/utils/format'

const notif = useNotificationsStore()

/** Groupes proposés par défaut (âge max exclu : un enfant de 4 ans va chez les Pré-scolaires). */
const MODELE = [
  {
    nom: 'Pouponnière',
    trancheAge: '0 à 18 mois',
    ageMinMois: 0,
    ageMaxMois: 18,
    couleur: '#e0607e',
    description: [
      'Environnement sécurisant et affectueux',
      'Soins individualisés (sommeil, repas, hygiène)',
      'Stimulation sensorielle douce (musique, textures)',
      'Encouragement à la motricité libre',
      "Développement du lien d'attachement",
    ],
  },
  {
    nom: 'Petits Pas',
    trancheAge: '18 mois à 2 ans',
    ageMinMois: 18,
    ageMaxMois: 24,
    couleur: '#2bb5a0',
    description: [
      "Début de l'autonomie et développement du langage",
      'Activités de motricité globale (danse, jeux moteurs)',
      'Routines simples et jeux symboliques',
      'Socialisation progressive en petit groupe',
      "Exploration active de l'environnement",
    ],
  },
  {
    nom: 'Explorateurs',
    trancheAge: '2 à 4 ans',
    ageMinMois: 24,
    ageMaxMois: 48,
    couleur: '#2a9bd6',
    description: [
      "Apprentissages par le jeu et l'exploration",
      'Développement de la motricité fine et du langage',
      'Activités créatives (bricolage, peinture, pâte à modeler)',
      'Initiation aux chiffres, lettres, couleurs et formes',
      'Renforcement des habiletés sociales',
    ],
  },
  {
    nom: 'Pré-scolaires',
    trancheAge: '4 à 5 ans',
    ageMinMois: 48,
    ageMaxMois: 72,
    couleur: '#4f9d69',
    description: [
      "Préparation à l'école par des activités éducatives",
      'Travail sur l’autonomie, la concentration et les règles de groupe',
      'Développement du langage, du raisonnement et de la créativité',
      'Projets thématiques et jeux de rôle',
      "Apprentissages préalables à la lecture, l'écriture et les mathématiques",
    ],
  },
]
const COULEURS = ['#e0607e', '#2bb5a0', '#2a9bd6', '#4f9d69', '#d9822b', '#5b5fc7', '#8e44ad', '#b7791f']

const groupes = ref<Groupe[]>([])
const personnel = ref<MembrePersonnel[]>([])
const reaffectations = ref<Reaffectation[]>([])
const aDeplacer = ref<number[]>([])
const edition = ref<number | 'nouveau' | null>(null)
const f = reactive({
  nom: '',
  couleur: COULEURS[0]!,
  ageMinMois: null as number | null,
  ageMaxMois: null as number | null,
  description: '',
  gestionnaireIds: [] as number[],
})
const erreur = ref('')
const envoi = ref(false)

const modeleManquant = computed(() => MODELE.filter((m) => !groupes.value.some((g) => g.nom.toLowerCase() === m.nom.toLowerCase())))
const sansTranche = computed(() => groupes.value.filter((g) => g.ageMinMois == null && g.ageMaxMois == null))

async function chargerReaffectations() {
  reaffectations.value = await api<Reaffectation[]>('/groupes/reaffectation').catch(() => [])
  aDeplacer.value = reaffectations.value.map((r) => r.enfant.id)
}

async function charger() {
  groupes.value = await api<Groupe[]>('/groupes').catch((e) => (notif.erreur(e), []))
  chargerReaffectations()
}

onMounted(async () => {
  await charger()
  personnel.value = (await api<{ membres: MembrePersonnel[] }>('/personnel').catch(() => ({ membres: [] }))).membres.filter((m) => m.actif)
})

function ouvrir(g?: Groupe) {
  erreur.value = ''
  edition.value = g?.id ?? 'nouveau'
  Object.assign(f, {
    nom: g?.nom ?? '',
    couleur: g?.couleur ?? COULEURS[groupes.value.length % COULEURS.length],
    ageMinMois: g?.ageMinMois ?? null,
    ageMaxMois: g?.ageMaxMois ?? null,
    description: g?.description ?? '',
    gestionnaireIds: g?.gestionnaires.map((x) => x.id) ?? [],
  })
}

const vide = (v: unknown) => v === '' || v === null || v === undefined
const corps = () => ({
  ...f,
  ageMinMois: vide(f.ageMinMois) ? null : Number(f.ageMinMois),
  ageMaxMois: vide(f.ageMaxMois) ? null : Number(f.ageMaxMois),
  trancheAge: formaterTranche({
    ageMinMois: vide(f.ageMinMois) ? null : Number(f.ageMinMois),
    ageMaxMois: vide(f.ageMaxMois) ? null : Number(f.ageMaxMois),
  }),
})

async function enregistrer() {
  erreur.value = ''
  try {
    const nouveau = edition.value === 'nouveau'
    await api(nouveau ? '/groupes' : `/groupes/${edition.value}`, { method: nouveau ? 'POST' : 'PATCH', body: corps() })
    notif.succes(nouveau ? `Groupe « ${f.nom} » créé.` : 'Groupe enregistré.')
    edition.value = null
    charger()
  } catch (e) {
    erreur.value = (e as Error).message
  }
}

async function creerModele() {
  envoi.value = true
  try {
    for (const m of modeleManquant.value)
      await api('/groupes', { method: 'POST', body: { ...m, description: m.description.join('\n') } })
    notif.succes('Groupes créés. Les nouveaux enfants y seront placés automatiquement selon leur âge.')
    await charger()
  } catch (e) {
    notif.erreur(e)
  } finally {
    envoi.value = false
  }
}

async function deplacer() {
  try {
    const r = await api<{ deplaces: number }>('/groupes/reaffectation', { method: 'POST', body: { enfantIds: aDeplacer.value } })
    notif.succes(`${r.deplaces} enfant(s) déplacé(s) dans le groupe de leur âge.`)
    charger()
  } catch (e) {
    notif.erreur(e)
  }
}

async function supprimer(g: Groupe) {
  const ok = await notif.confirmer({
    titre: `Supprimer « ${g.nom} » ?`,
    message: `Les ${g.nombreEnfants ?? 0} enfant(s) de ce groupe seront conservés, sans groupe.`,
    confirmer: 'Supprimer',
    danger: true,
  })
  if (!ok) return
  await api(`/groupes/${g.id}`, { method: 'DELETE' }).then(() => notif.succes('Groupe supprimé.'), notif.erreur)
  charger()
}

const basculer = (liste: number[], id: number) => (liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id])
</script>

<template>
  <div class="conteneur">
    <div class="entete-page">
      <div>
        <h1>Groupes</h1>
        <span class="doux">Chaque enfant inscrit est placé automatiquement dans le groupe qui correspond à son âge.</span>
      </div>
      <button class="btn" @click="ouvrir()">+ Nouveau groupe</button>
    </div>

    <!-- Modèle de groupes -->
    <div v-if="modeleManquant.length === MODELE.length" class="carte modele">
      <h2>Créer vos groupes en un clic</h2>
      <p class="doux petit">Les 4 groupes ci-dessous seront créés avec leur tranche d'âge et leur description. Vous pourrez les modifier ensuite.</p>
      <div class="rangee" style="margin-bottom: 0.75rem">
        <span v-for="m in MODELE" :key="m.nom" class="badge" :style="{ background: m.couleur + '22', color: m.couleur, borderColor: 'transparent' }">
          {{ m.nom }} ({{ m.trancheAge }})
        </span>
      </div>
      <button class="btn" :disabled="envoi" @click="creerModele">{{ envoi ? 'Création…' : 'Créer ces 4 groupes' }}</button>
    </div>
    <div v-else-if="modeleManquant.length" class="alerte petit rangee">
      <span>Groupes standards manquants : {{ modeleManquant.map((m) => m.nom).join(', ') }}.</span>
      <button class="btn secondaire petit" :disabled="envoi" @click="creerModele">Les ajouter</button>
    </div>

    <!-- Enfants à changer de groupe -->
    <div v-if="reaffectations.length" class="carte reaffectation">
      <h2>{{ reaffectations.length }} enfant(s) à placer dans le groupe de leur âge</h2>
      <p class="doux petit">Les enfants grandissent : voici ceux dont le groupe ne correspond plus (ou pas encore) à leur âge.</p>
      <div v-for="r in reaffectations" :key="r.enfant.id" class="ligne-reaff">
        <label class="case" style="margin: 0">
          <input type="checkbox" :checked="aDeplacer.includes(r.enfant.id)" @change="aDeplacer = basculer(aDeplacer, r.enfant.id)" />
          <strong>{{ r.enfant.prenom }} {{ r.enfant.nom }}</strong>
        </label>
        <span class="doux petit">{{ formaterMois(r.ageMois) }}</span>
        <span class="espace" />
        <span class="petit">{{ r.actuel?.nom ?? 'Sans groupe' }} → <strong>{{ r.suggere.nom }}</strong></span>
      </div>
      <button class="btn" style="margin-top: 0.75rem" :disabled="!aDeplacer.length" @click="deplacer">
        Déplacer {{ aDeplacer.length }} enfant(s)
      </button>
    </div>

    <div v-if="sansTranche.length && groupes.length" class="alerte avert petit">
      Sans tranche d'âge (pas d'affectation automatique) : {{ sansTranche.map((g) => g.nom).join(', ') }}.
    </div>

    <div class="grille">
      <div v-for="g in groupes" :key="g.id" class="carte groupe" :style="{ borderTopColor: g.couleur ?? 'var(--c-bord)' }">
        <div class="rangee">
          <h3 style="margin: 0">{{ g.nom }}</h3>
          <span class="espace" />
          <span class="badge vert">{{ g.nombreEnfants }} enfant(s)</span>
        </div>
        <p class="tranche" :style="{ color: g.couleur ?? 'inherit' }">{{ formaterTranche(g) || 'Âge non précisé' }}</p>
        <ul v-if="g.description" class="description">
          <li v-for="(l, i) in g.description.split('\n').filter(Boolean)" :key="i">{{ l }}</li>
        </ul>
        <p class="petit" style="margin-top: auto">
          <span class="doux">Éducatrices :</span>
          {{ g.gestionnaires.length ? g.gestionnaires.map((x) => `${x.prenom} ${x.nom}`).join(', ') : 'aucune' }}
        </p>
        <div class="rangee">
          <button class="btn secondaire petit" @click="ouvrir(g)">Modifier</button>
          <button class="btn lien petit" style="color: var(--c-danger)" @click="supprimer(g)">Supprimer</button>
        </div>
      </div>
    </div>

    <FenetreModale v-if="edition" :titre="edition === 'nouveau' ? 'Nouveau groupe' : 'Modifier le groupe'" large @fermer="edition = null">
      <form @submit.prevent="enregistrer">
        <label class="champ"><span>Nom</span><input v-model="f.nom" required maxlength="100" placeholder="Ex. : Pouponnière" /></label>

        <div class="champ">
          <span>Tranche d'âge (en mois) — pour l'affectation automatique</span>
          <div class="rangee">
            <span class="petit">De</span>
            <input v-model.number="f.ageMinMois" type="number" min="0" max="240" style="max-width: 100px" placeholder="0" />
            <span class="petit">mois à</span>
            <input v-model.number="f.ageMaxMois" type="number" min="1" max="240" style="max-width: 100px" placeholder="18" />
            <span class="petit">mois</span>
          </div>
          <small>
            Repères : 18 mois = 1 an ½ · 24 = 2 ans · 36 = 3 ans · 48 = 4 ans · 60 = 5 ans · 72 = 6 ans. L'enfant passe au groupe
            suivant le jour où il atteint l'âge maximum.
            <template v-if="!vide(f.ageMinMois) || !vide(f.ageMaxMois)">
              <br /><strong>Affiché : {{ formaterTranche({ ageMinMois: vide(f.ageMinMois) ? null : Number(f.ageMinMois), ageMaxMois: vide(f.ageMaxMois) ? null : Number(f.ageMaxMois) }) }}</strong>
            </template>
          </small>
        </div>

        <label class="champ">
          <span>Description (une ligne par point)</span>
          <textarea v-model="f.description" rows="5" maxlength="3000" placeholder="Environnement sécurisant et affectueux&#10;Soins individualisés…" />
        </label>

        <div class="champ">
          <span>Couleur</span>
          <div class="rangee">
            <button
              v-for="c in COULEURS"
              :key="c"
              type="button"
              class="pastille"
              :style="{ background: c, outline: f.couleur === c ? '3px solid var(--c-texte)' : 'none' }"
              :aria-label="c"
              @click="f.couleur = c"
            />
          </div>
        </div>

        <div v-if="personnel.length" class="champ">
          <span>Éducatrices assignées</span>
          <div class="puces">
            <button
              v-for="m in personnel"
              :key="m.utilisateur.id"
              type="button"
              class="puce"
              :class="{ actif: f.gestionnaireIds.includes(m.utilisateur.id) }"
              @click="f.gestionnaireIds = basculer(f.gestionnaireIds, m.utilisateur.id)"
            >
              {{ m.utilisateur.prenom }} {{ m.utilisateur.nom }}
            </button>
          </div>
        </div>

        <div v-if="erreur" class="alerte erreur">{{ erreur }}</div>
        <div class="rangee">
          <span class="espace" />
          <button type="button" class="btn secondaire" @click="edition = null">Annuler</button>
          <button class="btn">Enregistrer</button>
        </div>
      </form>
    </FenetreModale>
  </div>
</template>

<style scoped>
.modele,
.reaffectation {
  margin-bottom: 1.25rem;
  border-color: var(--c-primaire);
}
.ligne-reaff {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.9rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--c-bord);
}
.groupe {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border-top: 5px solid;
}
.tranche {
  font-weight: 700;
  margin: 0;
}
.description {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.875rem;
  color: var(--c-texte-doux);
}
.description li {
  margin-bottom: 0.2rem;
}
.pastille {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  outline-offset: 2px;
}
</style>
