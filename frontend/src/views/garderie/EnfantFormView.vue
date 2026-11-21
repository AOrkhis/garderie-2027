<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { ContactUrgence, Enfant, Groupe, LienParent, ResultatInvitation } from '@/api/types'
import { useNotificationsStore } from '@/stores/notifications'
import { ageEnMois, aujourdhuiLocal, formaterMois, formaterTranche, groupePourAge, LIENS } from '@/utils/format'

const notif = useNotificationsStore()
const route = useRoute()
const router = useRouter()
const id = route.params.id ? Number(route.params.id) : null
const groupes = ref<Groupe[]>([])
const f = reactive({
  prenom: '',
  nom: '',
  dateNaissance: '',
  groupeId: (id ? null : 'auto') as number | null | 'auto',
  allergies: '',
  restrictionsAlimentaires: '',
  notesMedicales: '',
  consentementPhoto: false,
  dateEntree: aujourdhuiLocal(),
  contactsUrgence: [] as ContactUrgence[],
})
const parent = reactive({ courriel: '', prenom: '', nom: '', lien: 'MERE' as LienParent })
const erreur = ref('')
const envoi = ref(false)

onMounted(async () => {
  groupes.value = await api<Groupe[]>('/groupes').catch(() => [])
  if (id) {
    const e = await api<Enfant>(`/enfants/${id}`)
    Object.assign(f, {
      prenom: e.prenom,
      nom: e.nom,
      dateNaissance: e.dateNaissance,
      groupeId: e.groupeId,
      allergies: e.allergies ?? '',
      restrictionsAlimentaires: e.restrictionsAlimentaires ?? '',
      notesMedicales: e.notesMedicales ?? '',
      consentementPhoto: e.consentementPhoto,
      dateEntree: e.dateEntree ?? '',
      contactsUrgence: (e.contactsUrgence ?? []).map(({ nom, telephone, lien, autoriseARecuperer }) => ({ nom, telephone, lien, autoriseARecuperer })),
    })
    dateInitiale.value = e.dateNaissance
  }
})

// En modification : si la date de naissance change, le groupe passe en « automatique ».
const dateInitiale = ref('')
watch(
  () => f.dateNaissance,
  (d) => {
    if (id && dateInitiale.value && d !== dateInitiale.value && avecTranche.value) f.groupeId = 'auto'
  },
)

const ageMois = computed(() => (/^\d{4}-\d{2}-\d{2}$/.test(f.dateNaissance) ? ageEnMois(f.dateNaissance) : null))
const avecTranche = computed(() => groupes.value.some((g) => g.ageMinMois != null || g.ageMaxMois != null))
const groupeSuggere = computed(() => (ageMois.value == null ? null : groupePourAge(groupes.value, ageMois.value)))

const ajouterContact = () => f.contactsUrgence.push({ nom: '', telephone: '', lien: '', autoriseARecuperer: false })

async function enregistrer() {
  erreur.value = ''
  envoi.value = true
  try {
    const corps = {
      ...f,
      // « auto » : le serveur choisit le groupe selon l'âge
      groupeId: f.groupeId === 'auto' ? undefined : f.groupeId,
      ...(id && f.groupeId === 'auto' ? { groupeAuto: true } : {}),
      dateEntree: f.dateEntree || undefined,
      contactsUrgence: f.contactsUrgence.map((c) => ({ ...c, lien: c.lien || undefined })),
    }
    const e = await api<Enfant>(id ? `/enfants/${id}` : '/enfants', { method: id ? 'PATCH' : 'POST', body: corps })
    if (id) {
      notif.succes(`Fiche enregistrée${e.groupe ? ` — groupe : ${e.groupe.nom}` : ' — sans groupe'}.`)
      return router.push(`/garderie/enfants/${e.id}`)
    }
    notif.succes(`${e.prenom} est inscrit(e)${e.groupe ? ` dans le groupe « ${e.groupe.nom} »` : ''}.`)
    if (parent.courriel) {
      try {
        const r = await api<ResultatInvitation>(`/enfants/${e.id}/parents`, { method: 'POST', body: parent })
        notif.succes(r.statut === 'lie' ? `Compte de ${parent.courriel} lié à ${e.prenom}.` : `Invitation envoyée à ${parent.courriel}.`)
        if (r.lienInvitation)
          sessionStorage.setItem('garderie2027.lien', JSON.stringify({ lien: r.lienInvitation, courriel: parent.courriel }))
      } catch (err) {
        notif.erreur(err)
      }
    }
    router.push({ path: `/garderie/enfants/${e.id}`, query: { onglet: 'parents' } })
  } catch (e) {
    erreur.value = (e as Error).message
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <div class="conteneur" style="max-width: 760px">
    <div class="entete-page">
      <h1>{{ id ? 'Modifier la fiche' : 'Inscrire un enfant' }}</h1>
      <RouterLink :to="id ? `/garderie/enfants/${id}` : '/garderie/enfants'" class="btn secondaire">Annuler</RouterLink>
    </div>

    <form class="pile" @submit.prevent="enregistrer">
      <div class="carte">
        <h2>Identité</h2>
        <p v-if="!avecTranche" class="alerte avert petit">
          Aucun groupe avec tranche d'âge : l'enfant ne pourra pas être placé automatiquement.
          <RouterLink to="/garderie/groupes">Créer les groupes</RouterLink>
        </p>
        <div class="deux-colonnes">
          <label class="champ"><span>Prénom</span><input v-model="f.prenom" required maxlength="80" /></label>
          <label class="champ"><span>Nom</span><input v-model="f.nom" required maxlength="80" /></label>
          <label class="champ">
            <span>Date de naissance</span>
            <input v-model="f.dateNaissance" type="date" required :max="aujourdhuiLocal()" />
            <small v-if="ageMois != null && ageMois >= 0">Âge : {{ formaterMois(ageMois) }}</small>
          </label>
          <label class="champ"><span>Date d'entrée</span><input v-model="f.dateEntree" type="date" /></label>
        </div>
        <label class="champ">
          <span>Groupe</span>
          <select v-model="f.groupeId">
            <option v-if="avecTranche || !id" value="auto">Automatique — selon l'âge</option>
            <option :value="null">Sans groupe</option>
            <option v-for="g in groupes" :key="g.id" :value="g.id">{{ g.nom }}{{ formaterTranche(g) ? ` (${formaterTranche(g)})` : '' }}</option>
          </select>
        </label>
        <div v-if="f.groupeId === 'auto' && ageMois != null" class="suggestion" :class="{ aucun: !groupeSuggere }">
          <template v-if="groupeSuggere">
            <span class="point" :style="{ background: groupeSuggere.couleur ?? 'var(--c-primaire)' }" />
            Sera placé(e) dans <strong>{{ groupeSuggere.nom }}</strong> ({{ formaterTranche(groupeSuggere) }})
          </template>
          <template v-else>Aucun groupe ne correspond à {{ formaterMois(Math.max(0, ageMois)) }} : l'enfant sera inscrit sans groupe.</template>
        </div>
        <div v-else-if="id && groupeSuggere && f.groupeId !== groupeSuggere.id" class="suggestion">
          Selon son âge ({{ formaterMois(ageMois ?? 0) }}), le groupe conseillé est <strong>{{ groupeSuggere.nom }}</strong>.
          <button type="button" class="btn lien petit" @click="f.groupeId = groupeSuggere.id">Appliquer</button>
        </div>
      </div>

      <div class="carte">
        <h2>Santé et alimentation</h2>
        <label class="champ"><span>Allergies</span><textarea v-model="f.allergies" placeholder="Ex. : arachides, œufs…" /><small>Affichées en évidence pour tout le personnel.</small></label>
        <label class="champ"><span>Restrictions alimentaires</span><textarea v-model="f.restrictionsAlimentaires" placeholder="Ex. : végétarien, sans porc…" /></label>
        <label class="champ"><span>Notes médicales / importantes</span><textarea v-model="f.notesMedicales" /></label>
      </div>

      <div class="carte">
        <h2>Consentement</h2>
        <label class="case">
          <input v-model="f.consentementPhoto" type="checkbox" />
          Les parents autorisent la prise de photos de l'enfant
        </label>
        <small class="doux">Sans consentement, l'enfant ne peut pas être identifié sur une photo.</small>
      </div>

      <div class="carte">
        <div class="rangee" style="margin-bottom: 0.75rem">
          <h2 style="margin: 0">Contacts d'urgence</h2>
          <span class="espace" />
          <button type="button" class="btn secondaire petit" @click="ajouterContact">+ Ajouter</button>
        </div>
        <p v-if="!f.contactsUrgence.length" class="doux petit">Aucun contact d'urgence.</p>
        <div v-for="(c, i) in f.contactsUrgence" :key="i" class="contact">
          <div class="deux-colonnes">
            <label class="champ"><span>Nom</span><input v-model="c.nom" required maxlength="160" /></label>
            <label class="champ"><span>Téléphone</span><input v-model="c.telephone" type="tel" required maxlength="30" /></label>
            <label class="champ"><span>Lien</span><input v-model="c.lien" placeholder="Ex. : grand-mère" maxlength="60" /></label>
          </div>
          <div class="rangee">
            <label class="case" style="margin: 0"><input v-model="c.autoriseARecuperer" type="checkbox" /> Autorisé à venir chercher l'enfant</label>
            <span class="espace" />
            <button type="button" class="btn lien petit" style="color: var(--c-danger)" @click="f.contactsUrgence.splice(i, 1)">Retirer</button>
          </div>
        </div>
      </div>

      <div v-if="!id" class="carte">
        <h2>Inviter un parent <span class="doux petit">(facultatif)</span></h2>
        <p class="doux petit">Le parent recevra une invitation pour suivre la journée de son enfant. Vous pourrez en ajouter d'autres ensuite.</p>
        <label class="champ"><span>Courriel du parent</span><input v-model="parent.courriel" type="email" placeholder="parent@exemple.com" /></label>
        <div v-if="parent.courriel" class="deux-colonnes">
          <label class="champ"><span>Prénom</span><input v-model="parent.prenom" maxlength="80" /></label>
          <label class="champ"><span>Nom</span><input v-model="parent.nom" maxlength="80" /></label>
          <label class="champ">
            <span>Lien avec l'enfant</span>
            <select v-model="parent.lien">
              <option v-for="(l, k) in LIENS" :key="k" :value="k">{{ l }}</option>
            </select>
          </label>
        </div>
      </div>

      <div v-if="erreur" class="alerte erreur">{{ erreur }}</div>
      <button class="btn" :disabled="envoi">
        {{ envoi ? 'Enregistrement…' : id ? 'Enregistrer' : parent.courriel ? "Inscrire l'enfant et inviter le parent" : "Inscrire l'enfant" }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.suggestion {
  background: var(--c-primaire-clair);
  color: var(--c-primaire-fonce);
  border-radius: 10px;
  padding: 0.6rem 0.8rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}
.suggestion.aucun {
  background: var(--c-avert-clair);
  color: var(--c-avert);
}
.point {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}
.contact {
  border: 1px solid var(--c-bord);
  border-radius: 10px;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
}
</style>
