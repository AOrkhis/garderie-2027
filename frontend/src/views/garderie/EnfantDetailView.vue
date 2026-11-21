<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { api } from '@/api/client'
import type {
  Enfant,
  Entree,
  Invitation,
  JournalJour,
  LienParent,
  PagePhotos,
  ParentLie,
  Photo,
  ResultatInvitation,
} from '@/api/types'
import AvatarEnfant from '@/components/AvatarEnfant.vue'
import ChronologieJournal from '@/components/ChronologieJournal.vue'
import FormulaireEntree from '@/components/FormulaireEntree.vue'
import GaleriePhotos from '@/components/GaleriePhotos.vue'
import LienInvitation from '@/components/LienInvitation.vue'
import NavigationDate from '@/components/NavigationDate.vue'
import ResumeJour from '@/components/ResumeJour.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { age, formaterDate, LIENS, PRESENCES } from '@/utils/format'

const auth = useAuthStore()
const notif = useNotificationsStore()
const route = useRoute()
const id = Number(route.params.id)
const onglet = ref<'journal' | 'fiche' | 'parents' | 'photos'>((route.query.onglet as 'parents') ?? 'journal')
const enfant = ref<Enfant | null>(null)
const journal = ref<JournalJour | null>(null)
const date = ref<string | undefined>()
const parents = ref<{ parents: ParentLie[]; invitations: Invitation[] }>({ parents: [], invitations: [] })
const photos = ref<PagePhotos | null>(null)
const formulaire = ref<{ entree?: Entree } | null>(null)
const erreur = ref('')
// Lien transmis par le formulaire d'inscription (mode sans courriel)
const lienCopie = ref<{ lien: string; courriel: string } | null>(JSON.parse(sessionStorage.getItem('garderie2027.lien') ?? 'null'))
sessionStorage.removeItem('garderie2027.lien')
const invitation = reactive({ courriel: '', prenom: '', nom: '', lien: 'MERE' as LienParent })
const envoi = ref(false)

const echec = (e: unknown) => notif.erreur(e)
const couleurHero = computed(() => {
  const c = enfant.value?.groupe?.couleur ?? '#6a4fd8'
  return `linear-gradient(120deg, ${c}, ${c}b8)`
})

async function chargerEnfant() {
  enfant.value = await api<Enfant>(`/enfants/${id}`).catch((e) => ((erreur.value = e.message), null))
}
async function chargerJournal() {
  journal.value = await api<JournalJour>(`/enfants/${id}/journal${date.value ? `?date=${date.value}` : ''}`).catch((e) => (echec(e), null))
}
async function chargerParents() {
  parents.value = await api<typeof parents.value>(`/enfants/${id}/parents`).catch((e) => (echec(e), parents.value))
}
async function chargerPhotos(page = 1) {
  photos.value = await api<PagePhotos>(`/enfants/${id}/photos?page=${page}`).catch((e) => (echec(e), null))
}

onMounted(() => Promise.all([chargerEnfant(), chargerJournal()]))
watch(
  onglet,
  (o) => {
    if (o === 'parents') chargerParents()
    if (o === 'photos') chargerPhotos()
  },
  { immediate: true },
)

const modifiable = (e: Entree) =>
  auth.estAdmin || (e.auteur?.id === auth.moi?.id && journal.value?.date === journal.value?.aujourdhui)
const photoSupprimable = (p: Photo) => auth.estAdmin || p.auteurId === auth.moi?.id

async function supprimerEntree(e: Entree) {
  if (!(await notif.confirmer({ titre: 'Supprimer cette entrée ?', message: 'Les parents ne la verront plus.', confirmer: 'Supprimer', danger: true })))
    return
  await api(`/journal/${e.id}`, { method: 'DELETE' }).then(() => notif.succes('Entrée supprimée.'), echec)
  chargerJournal()
}

async function supprimerPhoto(p: Photo) {
  if (!(await notif.confirmer({ titre: 'Supprimer cette photo ?', message: 'La photo sera supprimée définitivement.', confirmer: 'Supprimer', danger: true })))
    return
  await api(`/photos/${p.id}`, { method: 'DELETE' }).then(() => notif.succes('Photo supprimée.'), echec)
  chargerPhotos(photos.value?.page)
}

async function inviterParent() {
  envoi.value = true
  try {
    const r = await api<ResultatInvitation>(`/enfants/${id}/parents`, { method: 'POST', body: invitation })
    if (r.statut === 'lie') notif.succes(`Le compte existant de ${invitation.courriel} a été lié à ${enfant.value?.prenom}.`)
    else notif.succes(`Invitation envoyée à ${invitation.courriel}.`)
    lienCopie.value = r.lienInvitation ? { lien: r.lienInvitation, courriel: invitation.courriel } : null
    Object.assign(invitation, { courriel: '', prenom: '', nom: '' })
    chargerParents()
  } catch (e) {
    echec(e)
  } finally {
    envoi.value = false
  }
}

async function renvoyerInvitation(i: Invitation) {
  try {
    const r = await api<ResultatInvitation>(`/enfants/${id}/invitations/${i.id}/renvoyer`, { method: 'POST' })
    notif.succes(`Nouvelle invitation envoyée à ${i.courriel}.`)
    lienCopie.value = r.lienInvitation ? { lien: r.lienInvitation, courriel: i.courriel } : null
    chargerParents()
  } catch (e) {
    echec(e)
  }
}

async function retirerParent(p: ParentLie) {
  const ok = await notif.confirmer({
    titre: 'Retirer ce parent ?',
    message: `${p.prenom} ${p.nom} n'aura plus accès au journal de ${enfant.value?.prenom}.`,
    confirmer: 'Retirer',
    danger: true,
  })
  if (!ok) return
  await api(`/enfants/${id}/parents/${p.id}`, { method: 'DELETE' }).then(() => notif.succes('Accès retiré.'), echec)
  chargerParents()
}

async function annulerInvitation(i: Invitation) {
  await api(`/enfants/${id}/invitations/${i.id}`, { method: 'DELETE' }).then(() => notif.info('Invitation annulée.'), echec)
  chargerParents()
}

async function changerStatut() {
  if (!enfant.value) return
  const archiver = enfant.value.statut === 'ACTIF'
  if (
    archiver &&
    !(await notif.confirmer({
      titre: `Archiver ${enfant.value.prenom} ?`,
      message: "L'enfant n'apparaîtra plus dans la vue du jour. Son journal et ses photos sont conservés et vous pourrez le réactiver.",
      confirmer: 'Archiver',
    }))
  )
    return
  await api(`/enfants/${id}`, { method: 'PATCH', body: { statut: archiver ? 'ARCHIVE' : 'ACTIF' } }).then(
    () => notif.succes(archiver ? 'Enfant archivé.' : 'Enfant réactivé.'),
    echec,
  )
  chargerEnfant()
}

function entreeEnregistree(msg: string) {
  formulaire.value = null
  notif.succes(msg)
  chargerJournal()
}
</script>

<template>
  <div v-if="enfant" class="conteneur">
    <header class="hero">
      <div class="bande" :style="{ background: couleurHero }" />
      <div class="corps-hero">
        <AvatarEnfant :personne="enfant" :couleur="enfant.groupe?.couleur" :taille="76" class="avatar-hero" />
        <div class="qui">
          <h1>{{ enfant.prenom }} {{ enfant.nom }}</h1>
          <span class="doux">{{ age(enfant.dateNaissance) }} · {{ enfant.groupe?.nom ?? 'Sans groupe' }}</span>
          <span v-if="enfant.statut === 'ARCHIVE'" class="badge" style="margin-left: 0.5rem">Archivé</span>
        </div>
        <span class="espace" />
        <RouterLink :to="`/garderie/enfants/${id}/modifier`" class="btn secondaire">Modifier la fiche</RouterLink>
      </div>
    </header>

    <div v-if="enfant.allergies" class="alerte erreur"><strong>Allergies :</strong> {{ enfant.allergies }}</div>

    <div class="onglets">
      <button :class="{ actif: onglet === 'journal' }" @click="onglet = 'journal'">Journal</button>
      <button :class="{ actif: onglet === 'fiche' }" @click="onglet = 'fiche'">Fiche</button>
      <button :class="{ actif: onglet === 'parents' }" @click="onglet = 'parents'">Parents</button>
      <button :class="{ actif: onglet === 'photos' }" @click="onglet = 'photos'">Photos</button>
    </div>

    <!-- Journal -->
    <div v-if="onglet === 'journal' && journal" class="pile">
      <div class="rangee">
        <NavigationDate :date="journal.date" :aujourdhui="journal.aujourdhui" @changer="(d) => ((date = d), chargerJournal())" />
        <span class="espace" />
        <span class="badge" :class="{ vert: journal.presence === 'PRESENT' }">{{ PRESENCES[journal.presence] }}</span>
        <button v-if="enfant.statut === 'ACTIF'" class="btn" @click="formulaire = {}">+ Nouvelle entrée</button>
      </div>
      <div class="carte"><ResumeJour :resume="journal.resume" /></div>
      <div class="carte">
        <ChronologieJournal
          :entrees="journal.entrees"
          :modifiable="modifiable"
          @modifier="(e) => (formulaire = { entree: e })"
          @supprimer="supprimerEntree"
        />
      </div>
    </div>

    <!-- Fiche -->
    <div v-if="onglet === 'fiche'" class="grille">
      <div class="carte">
        <h3>Informations</h3>
        <p><span class="doux">Date de naissance :</span> {{ formaterDate(enfant.dateNaissance) }}</p>
        <p v-if="enfant.dateEntree"><span class="doux">Date d'entrée :</span> {{ formaterDate(enfant.dateEntree) }}</p>
        <p>
          <span class="doux">Consentement photo :</span>
          <span class="badge" :class="enfant.consentementPhoto ? 'vert' : 'orange'">{{ enfant.consentementPhoto ? 'Oui' : 'Non' }}</span>
        </p>
        <button class="btn secondaire petit" @click="changerStatut">
          {{ enfant.statut === 'ACTIF' ? 'Archiver l\'enfant' : 'Réactiver l\'enfant' }}
        </button>
      </div>
      <div class="carte">
        <h3>Santé et alimentation</h3>
        <p><span class="doux">Allergies :</span> {{ enfant.allergies || 'Aucune' }}</p>
        <p><span class="doux">Restrictions :</span> {{ enfant.restrictionsAlimentaires || 'Aucune' }}</p>
        <p style="white-space: pre-line"><span class="doux">Notes :</span> {{ enfant.notesMedicales || '—' }}</p>
      </div>
      <div class="carte">
        <h3>Contacts d'urgence</h3>
        <p v-if="!enfant.contactsUrgence?.length" class="doux">Aucun.</p>
        <div v-for="c in enfant.contactsUrgence" :key="c.id" style="margin-bottom: 0.6rem">
          <strong>{{ c.nom }}</strong> <span v-if="c.lien" class="doux">({{ c.lien }})</span><br />
          <a :href="`tel:${c.telephone}`">{{ c.telephone }}</a>
          <span v-if="c.autoriseARecuperer" class="badge vert" style="margin-left: 0.4rem">Peut récupérer</span>
        </div>
      </div>
    </div>

    <!-- Parents -->
    <LienInvitation v-if="onglet === 'parents' && lienCopie" :lien="lienCopie.lien" :courriel="lienCopie.courriel" @fermer="lienCopie = null" />
    <div v-if="onglet === 'parents'" class="grille">
      <div class="carte">
        <h3>Parents ayant accès</h3>
        <p v-if="!parents.parents.length" class="doux">
          Aucun parent pour l'instant. Invitez un parent avec le formulaire : il pourra suivre la journée de {{ enfant.prenom }}.
        </p>
        <div v-for="p in parents.parents" :key="p.id" class="rangee ligne">
          <div>
            <strong>{{ p.prenom }} {{ p.nom }}</strong> <span class="badge">{{ LIENS[p.lien] }}</span><br />
            <small class="doux">{{ p.courriel }}<template v-if="p.telephone"> · {{ p.telephone }}</template></small>
          </div>
          <span class="espace" />
          <button class="btn lien petit" style="color: var(--c-danger)" @click="retirerParent(p)">Retirer</button>
        </div>
        <template v-if="parents.invitations.length">
          <h3 style="margin-top: 1rem">Invitations en attente</h3>
          <div v-for="i in parents.invitations" :key="i.id" class="rangee ligne">
            <div>
              {{ i.prenom }} {{ i.nom }} <small class="doux">{{ i.courriel }}</small><br />
              <small class="doux">Expire le {{ formaterDate(i.expireLe) }}</small>
            </div>
            <span class="espace" />
            <button class="btn secondaire petit" @click="renvoyerInvitation(i)">Renvoyer</button>
            <button class="btn lien petit" @click="annulerInvitation(i)">Annuler</button>
          </div>
        </template>
      </div>
      <form class="carte" @submit.prevent="inviterParent">
        <h3>Inviter un parent</h3>
        <p class="doux petit">Le parent recevra un courriel pour créer son compte et suivre la journée de {{ enfant.prenom }}.</p>
        <label class="champ"><span>Courriel</span><input v-model="invitation.courriel" type="email" required /></label>
        <div class="deux-colonnes">
          <label class="champ"><span>Prénom</span><input v-model="invitation.prenom" maxlength="80" /></label>
          <label class="champ"><span>Nom</span><input v-model="invitation.nom" maxlength="80" /></label>
        </div>
        <label class="champ">
          <span>Lien avec l'enfant</span>
          <select v-model="invitation.lien">
            <option v-for="(l, k) in LIENS" :key="k" :value="k">{{ l }}</option>
          </select>
        </label>
        <button class="btn bloc" :disabled="envoi">Envoyer l'invitation</button>
      </form>
    </div>

    <!-- Photos -->
    <div v-if="onglet === 'photos' && photos" class="carte">
      <div v-if="!photos.photos.length" class="vide">Aucune photo de {{ enfant.prenom }}.</div>
      <GaleriePhotos :photos="photos.photos" :supprimable="photoSupprimable" @supprimer="supprimerPhoto" />
      <div v-if="photos.pages > 1" class="rangee" style="justify-content: center; margin-top: 1rem">
        <button class="btn secondaire petit" :disabled="photos.page <= 1" @click="chargerPhotos(photos.page - 1)">‹ Précédentes</button>
        <span class="doux petit">Page {{ photos.page }} / {{ photos.pages }}</span>
        <button class="btn secondaire petit" :disabled="photos.page >= photos.pages" @click="chargerPhotos(photos.page + 1)">Suivantes ›</button>
      </div>
    </div>

    <FormulaireEntree
      v-if="formulaire"
      :enfants="[enfant]"
      :selection="[enfant.id]"
      :entree="formulaire.entree"
      :date="journal && journal.date !== journal.aujourdhui ? journal.date : undefined"
      @fermer="formulaire = null"
      @enregistre="entreeEnregistree"
    />
  </div>
  <div v-else class="conteneur">
    <div v-if="erreur" class="alerte erreur">{{ erreur }}</div>
    <p v-else class="doux">Chargement…</p>
  </div>
</template>

<style scoped>
.hero {
  border-radius: var(--rayon);
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--c-bord);
  box-shadow: var(--ombre);
  margin-bottom: 1.1rem;
}
.bande {
  height: 76px;
}
.corps-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.9rem;
  padding: 0 1.25rem 1.1rem;
}
.avatar-hero {
  margin-top: -30px;
  outline: 4px solid #fff;
  border-radius: 50%;
  box-shadow: var(--ombre);
}
.qui h1 {
  margin: 0;
}
.ligne {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--c-bord);
  flex-wrap: nowrap;
}
@media (max-width: 500px) {
  .corps-hero .btn {
    width: 100%;
  }
}
</style>
