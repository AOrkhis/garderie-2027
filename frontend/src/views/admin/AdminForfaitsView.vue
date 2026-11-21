<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '@/api/client'
import type { AdminForfaits, Forfait, ParametresPlateforme } from '@/api/types'
import OngletsAdmin from '@/components/OngletsAdmin.vue'
import { useForfaitsStore } from '@/stores/forfaits'
import { useNotificationsStore } from '@/stores/notifications'
import { formaterPrix } from '@/utils/format'

/** Version éditable d'un forfait : les nombres facultatifs sont des chaînes (vide = aucun / illimité). */
interface Brouillon {
  code: string
  nom: string
  description: string
  prixMensuel: string
  prixAnnuel: string
  prixAPartirDe: boolean
  maxEnfants: string
  maxPersonnel: string
  fonctionnalites: string[]
  points: string
  ordre: number
  public: boolean
  vedette: boolean
  etiquetteVedette: string
  libelleBouton: string
  stripePrixMensuelId: string
  stripePrixAnnuelId: string
}

const notif = useNotificationsStore()
const grillePublique = useForfaitsStore()
const donnees = ref<AdminForfaits | null>(null)
const catalogue = ref<{ cle: string; libelle: string }[]>([])
const brouillons = reactive<Record<string, Brouillon>>({})
const nouveau = ref<Brouillon | null>(null)
const reglages = reactive<ParametresPlateforme>({ forfaitDefaut: '', forfaitEssai: null, dureeEssaiJours: 0, mentionTaxes: '' })
const enregistrement = ref<string | null>(null)

const versBrouillon = (f: Forfait): Brouillon => ({
  code: f.code,
  nom: f.nom,
  description: f.description,
  prixMensuel: String(f.prixMensuel),
  prixAnnuel: f.prixAnnuel === null ? '' : String(f.prixAnnuel),
  prixAPartirDe: f.prixAPartirDe,
  maxEnfants: f.maxEnfants === null ? '' : String(f.maxEnfants),
  maxPersonnel: f.maxPersonnel === null ? '' : String(f.maxPersonnel),
  fonctionnalites: [...f.fonctionnalites],
  points: f.points.join('\n'),
  ordre: f.ordre,
  public: f.public,
  vedette: f.vedette,
  etiquetteVedette: f.etiquetteVedette ?? '',
  libelleBouton: f.libelleBouton ?? '',
  stripePrixMensuelId: f.stripePrixMensuelId ?? '',
  stripePrixAnnuelId: f.stripePrixAnnuelId ?? '',
})

const nombreOuNull = (s: string, entier = false) => {
  const t = s.trim().replace(',', '.')
  if (!t) return null
  const n = Number(t)
  if (Number.isNaN(n) || n < 0 || (entier && !Number.isInteger(n))) throw new Error(`Valeur invalide : « ${s} ».`)
  return n
}

function versCorps(b: Brouillon) {
  const prixMensuel = nombreOuNull(b.prixMensuel)
  if (prixMensuel === null) throw new Error('Le prix mensuel est requis (0 pour un forfait gratuit).')
  return {
    nom: b.nom.trim(),
    description: b.description.trim(),
    prixMensuel,
    prixAnnuel: nombreOuNull(b.prixAnnuel),
    prixAPartirDe: b.prixAPartirDe,
    maxEnfants: nombreOuNull(b.maxEnfants, true),
    maxPersonnel: nombreOuNull(b.maxPersonnel, true),
    fonctionnalites: b.fonctionnalites,
    points: b.points.split('\n').map((p) => p.trim()).filter(Boolean),
    ordre: Number(b.ordre) || 0,
    public: b.public,
    vedette: b.vedette,
    etiquetteVedette: b.etiquetteVedette.trim() || null,
    libelleBouton: b.libelleBouton.trim() || null,
    stripePrixMensuelId: b.stripePrixMensuelId.trim() || null,
    stripePrixAnnuelId: b.stripePrixAnnuelId.trim() || null,
  }
}

function appliquer(r: AdminForfaits) {
  donnees.value = r
  for (const k of Object.keys(brouillons)) delete brouillons[k]
  for (const f of r.forfaits) brouillons[f.code] = versBrouillon(f)
  Object.assign(reglages, r.parametres)
  grillePublique.charger(true)
}

onMounted(async () => {
  const [r, c] = await Promise.all([
    api<AdminForfaits>('/admin/forfaits'),
    api<{ cle: string; libelle: string }[]>('/admin/fonctionnalites').catch(() => []),
  ])
  catalogue.value = c
  appliquer(r)
})

const original = (code: string) => donnees.value?.forfaits.find((f) => f.code === code)
const modifie = (b: Brouillon) => {
  const o = original(b.code)
  return !!o && JSON.stringify(versBrouillon(o)) !== JSON.stringify(b)
}
const nomsForfaits = computed(() => donnees.value?.forfaits ?? [])

async function sauver(b: Brouillon) {
  enregistrement.value = b.code
  try {
    appliquer(await api<AdminForfaits>(`/admin/forfaits/${b.code}`, { method: 'PATCH', body: versCorps(b) }))
    notif.succes(`Forfait « ${b.nom} » enregistré. Les prix et limites s'appliquent immédiatement.`)
  } catch (e) {
    notif.erreur(e)
  } finally {
    enregistrement.value = null
  }
}

function annuler(b: Brouillon) {
  const o = original(b.code)
  if (o) brouillons[b.code] = versBrouillon(o)
}

async function supprimer(f: Forfait & { garderies: number }) {
  if (
    !(await notif.confirmer({
      titre: `Supprimer le forfait « ${f.nom} » ?`,
      message: 'Cette action est définitive. Pour simplement le retirer de la grille tarifaire, décochez plutôt « Visible ».',
      confirmer: 'Supprimer',
      danger: true,
    }))
  )
    return
  try {
    appliquer(await api<AdminForfaits>(`/admin/forfaits/${f.code}`, { method: 'DELETE' }))
    notif.succes('Forfait supprimé.')
  } catch (e) {
    notif.erreur(e)
  }
}

function commencerNouveau() {
  nouveau.value = {
    code: '',
    nom: '',
    description: '',
    prixMensuel: '',
    prixAnnuel: '',
    prixAPartirDe: false,
    maxEnfants: '',
    maxPersonnel: '',
    fonctionnalites: [],
    points: '',
    ordre: (nomsForfaits.value.at(-1)?.ordre ?? 0) + 1,
    public: false,
    vedette: false,
    etiquetteVedette: '',
    libelleBouton: '',
    stripePrixMensuelId: '',
    stripePrixAnnuelId: '',
  }
}

async function creer() {
  const b = nouveau.value!
  enregistrement.value = '__nouveau'
  try {
    appliquer(
      await api<AdminForfaits>('/admin/forfaits', {
        method: 'POST',
        body: { code: b.code.trim().toUpperCase(), ...versCorps(b) },
      }),
    )
    notif.succes(`Forfait « ${b.nom} » créé.`)
    nouveau.value = null
  } catch (e) {
    notif.erreur(e)
  } finally {
    enregistrement.value = null
  }
}

async function sauverReglages() {
  enregistrement.value = '__reglages'
  try {
    appliquer(
      await api<AdminForfaits>('/admin/parametres', {
        method: 'PATCH',
        body: { ...reglages, dureeEssaiJours: Number(reglages.dureeEssaiJours) || 0 },
      }),
    )
    notif.succes('Réglages de la plateforme enregistrés.')
  } catch (e) {
    notif.erreur(e)
  } finally {
    enregistrement.value = null
  }
}

function basculerFonction(b: Brouillon, cle: string) {
  b.fonctionnalites = b.fonctionnalites.includes(cle) ? b.fonctionnalites.filter((x) => x !== cle) : [...b.fonctionnalites, cle]
}
</script>

<template>
  <div class="conteneur">
    <div class="entete-page">
      <div>
        <h1>Forfaits et prix</h1>
        <span class="doux">Tout est modifiable : les changements s'appliquent immédiatement à la page d'accueil, aux limites et aux accès.</span>
      </div>
      <button class="btn" :disabled="!!nouveau" @click="commencerNouveau">+ Nouveau forfait</button>
    </div>
    <OngletsAdmin />

    <!-- Réglages globaux -->
    <form v-if="donnees" class="carte reglages" @submit.prevent="sauverReglages">
      <h2>Réglages de la plateforme</h2>
      <div class="grille-champs">
        <label class="champ">
          <span>Forfait à l'inscription</span>
          <select v-model="reglages.forfaitDefaut">
            <option v-for="f in nomsForfaits" :key="f.code" :value="f.code">{{ f.nom }}</option>
          </select>
        </label>
        <label class="champ">
          <span>Forfait pendant l'essai</span>
          <select v-model="reglages.forfaitEssai">
            <option :value="null">Aucun essai</option>
            <option v-for="f in nomsForfaits" :key="f.code" :value="f.code">{{ f.nom }}</option>
          </select>
        </label>
        <label class="champ">
          <span>Durée de l'essai (jours)</span>
          <input v-model.number="reglages.dureeEssaiJours" type="number" min="0" max="365" inputmode="numeric" />
        </label>
        <label class="champ large">
          <span>Mention sous les prix</span>
          <input v-model="reglages.mentionTaxes" maxlength="255" placeholder="Ex. : Prix en dollars canadiens, avant TPS et TVQ." />
        </label>
      </div>
      <p class="doux petit">L'essai ne s'applique qu'aux nouvelles inscriptions. Pour une garderie existante, utilisez « +30 j d'essai » dans l'onglet Garderies.</p>
      <button class="btn" :disabled="enregistrement === '__reglages'">Enregistrer les réglages</button>
    </form>

    <div v-if="!donnees" class="grille-forfaits" aria-busy="true">
      <div v-for="i in 4" :key="i" class="squelette" style="height: 520px" />
    </div>

    <div class="grille-forfaits">
      <!-- Nouveau forfait -->
      <form v-if="nouveau" class="carte forfait nouveau" @submit.prevent="creer">
        <div class="tete">
          <strong>Nouveau forfait</strong>
          <span class="espace" />
          <button type="button" class="btn lien petit" @click="nouveau = null">Annuler</button>
        </div>
        <label class="champ">
          <span>Code (définitif)</span>
          <input v-model="nouveau.code" required placeholder="Ex. : RESEAU" maxlength="40" style="text-transform: uppercase" />
          <small>Lettres majuscules, chiffres et « _ ». Il ne pourra plus être modifié.</small>
        </label>
        <label class="champ"><span>Nom affiché</span><input v-model="nouveau.nom" required maxlength="80" /></label>
        <label class="champ"><span>Prix mensuel ($)</span><input v-model="nouveau.prixMensuel" required inputmode="decimal" placeholder="0" /></label>
        <p class="doux petit" style="margin: 0 0 0.75rem">Le forfait est créé masqué : complétez-le puis cochez « Visible ».</p>
        <button class="btn bloc" :disabled="enregistrement === '__nouveau'">Créer le forfait</button>
      </form>

      <!-- Forfaits existants -->
      <form
        v-for="f in donnees?.forfaits ?? []"
        :key="f.code"
        class="carte forfait"
        :class="{ masque: !brouillons[f.code]!.public, sale: modifie(brouillons[f.code]!) }"
        @submit.prevent="sauver(brouillons[f.code]!)"
      >
        <template v-if="brouillons[f.code]">
          <div class="tete">
            <code>{{ f.code }}</code>
            <span class="badge" :class="f.garderies ? 'vert' : ''">{{ f.garderies }} garderie{{ f.garderies > 1 ? 's' : '' }}</span>
            <span v-if="reglages.forfaitDefaut === f.code" class="badge">Par défaut</span>
            <span v-if="reglages.forfaitEssai === f.code" class="badge orange">Essai</span>
          </div>

          <label class="champ"><span>Nom</span><input v-model="brouillons[f.code]!.nom" required maxlength="80" /></label>
          <label class="champ"><span>Description</span><input v-model="brouillons[f.code]!.description" maxlength="255" /></label>

          <fieldset>
            <legend>Prix (CAD, avant taxes)</legend>
            <div class="deux">
              <label class="champ"><span>Par mois</span><input v-model="brouillons[f.code]!.prixMensuel" required inputmode="decimal" /></label>
              <label class="champ"><span>Par an</span><input v-model="brouillons[f.code]!.prixAnnuel" inputmode="decimal" placeholder="Aucun" /></label>
            </div>
            <label class="case"><input v-model="brouillons[f.code]!.prixAPartirDe" type="checkbox" /> Afficher « dès » (prix de départ)</label>
          </fieldset>

          <fieldset>
            <legend>Limites</legend>
            <div class="deux">
              <label class="champ"><span>Enfants actifs</span><input v-model="brouillons[f.code]!.maxEnfants" inputmode="numeric" placeholder="Illimité" /></label>
              <label class="champ"><span>Personnel</span><input v-model="brouillons[f.code]!.maxPersonnel" inputmode="numeric" placeholder="Illimité" /></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Fonctionnalités incluses</legend>
            <label v-for="c in catalogue" :key="c.cle" class="case">
              <input type="checkbox" :checked="brouillons[f.code]!.fonctionnalites.includes(c.cle)" @change="basculerFonction(brouillons[f.code]!, c.cle)" />
              {{ c.libelle }}
            </label>
          </fieldset>

          <fieldset>
            <legend>Grille tarifaire</legend>
            <label class="champ">
              <span>Arguments (un par ligne)</span>
              <textarea v-model="brouillons[f.code]!.points" rows="4" />
            </label>
            <div class="deux">
              <label class="champ"><span>Texte du bouton</span><input v-model="brouillons[f.code]!.libelleBouton" maxlength="40" placeholder="Automatique" /></label>
              <label class="champ"><span>Ordre</span><input v-model.number="brouillons[f.code]!.ordre" type="number" min="0" /></label>
            </div>
            <label class="case"><input v-model="brouillons[f.code]!.public" type="checkbox" /> Visible sur la page d'accueil</label>
            <label class="case"><input v-model="brouillons[f.code]!.vedette" type="checkbox" /> Mis en avant</label>
            <label v-if="brouillons[f.code]!.vedette" class="champ">
              <span>Étiquette</span>
              <input v-model="brouillons[f.code]!.etiquetteVedette" maxlength="40" placeholder="Ex. : Le plus populaire" />
            </label>
          </fieldset>

          <fieldset>
            <legend>Vente en ligne (Stripe)</legend>
            <label class="champ">
              <span>ID du prix mensuel</span>
              <input v-model="brouillons[f.code]!.stripePrixMensuelId" maxlength="100" placeholder="price_… (vide = non vendu)" />
            </label>
            <label class="champ">
              <span>ID du prix annuel</span>
              <input v-model="brouillons[f.code]!.stripePrixAnnuelId" maxlength="100" placeholder="price_… (vide = non vendu)" />
            </label>
          </fieldset>

          <div class="apercu-prix doux petit">
            Aperçu : <strong>{{ brouillons[f.code]!.prixAPartirDe ? 'dès ' : '' }}{{ formaterPrix(Number(brouillons[f.code]!.prixMensuel.replace(',', '.')) || 0) }}</strong> / mois
          </div>

          <div class="pied-forfait">
            <button type="button" class="btn lien petit danger-lien" :disabled="f.garderies > 0" :title="f.garderies ? 'Utilisé par des garderies' : undefined" @click="supprimer(f)">
              Supprimer
            </button>
            <span class="espace" />
            <button v-if="modifie(brouillons[f.code]!)" type="button" class="btn secondaire petit" @click="annuler(brouillons[f.code]!)">Annuler</button>
            <button class="btn petit" :disabled="!modifie(brouillons[f.code]!) || enregistrement === f.code">Enregistrer</button>
          </div>
        </template>
      </form>
    </div>
  </div>
</template>

<style scoped>
.reglages {
  margin-bottom: 1.25rem;
}
.grille-champs {
  display: grid;
  gap: 0 1rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
.grille-champs .large {
  grid-column: 1 / -1;
}
.grille-forfaits {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  align-items: start;
}
.forfait {
  display: flex;
  flex-direction: column;
  padding: 1.1rem;
}
.forfait.masque {
  background: var(--c-fond);
}
.forfait.sale {
  border-color: #f59e0b;
  box-shadow: 0 0 0 1px #f59e0b;
}
.forfait.nouveau {
  border-style: dashed;
  border-color: var(--c-primaire);
}
.tete {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.9rem;
}
.tete code {
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--c-survol);
  border: 1px solid var(--c-bord);
  border-radius: 5px;
  padding: 0.1rem 0.4rem;
  margin-right: auto;
}
fieldset {
  border: none;
  border-top: 1px solid var(--c-bord);
  margin: 0.25rem 0 0;
  padding: 0.75rem 0 0;
}
legend {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--c-texte-doux);
  padding: 0 0.4rem 0 0;
}
.deux {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 0.6rem;
}
.forfait .champ {
  margin-bottom: 0.7rem;
}
.forfait .case {
  margin-bottom: 0.5rem;
  font-size: 0.88rem;
}
.forfait input:not([type='checkbox']),
.forfait textarea {
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
}
.apercu-prix {
  border-top: 1px solid var(--c-bord);
  padding-top: 0.7rem;
  margin-top: 0.25rem;
}
.pied-forfait {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.8rem;
}
.danger-lien {
  color: var(--c-danger);
}
.danger-lien:hover:not(:disabled) {
  background: var(--c-danger-clair);
}
.danger-lien:disabled {
  opacity: 0.35;
}
</style>
