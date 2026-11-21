<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { Forfait, Garderie } from '@/api/types'
import JaugeUtilisation from '@/components/JaugeUtilisation.vue'
import { useAuthStore } from '@/stores/auth'
import { useForfaitsStore } from '@/stores/forfaits'
import { useNotificationsStore } from '@/stores/notifications'
import { formaterDate, formaterPrix } from '@/utils/format'

const auth = useAuthStore()
const notif = useNotificationsStore()
const route = useRoute()
const router = useRouter()
const garderie = ref<Garderie | null>(null)
const f = reactive({ nom: '', adresse: '', telephone: '', courriel: '', heuresOuverture: '', fuseauHoraire: 'America/Toronto' })
const FUSEAUX = ['America/Toronto', 'America/Montreal', 'America/Halifax', 'America/Moncton', 'America/Winnipeg', 'America/Edmonton', 'America/Vancouver', 'Europe/Paris', 'Europe/Brussels', 'Europe/Zurich', 'Africa/Casablanca', 'Africa/Dakar', 'Africa/Abidjan', 'Africa/Tunis', 'Africa/Algiers']
const grille = useForfaitsStore()
const forfaits = computed(() => grille.forfaits)
const forfaitActuel = computed(() => forfaits.value.find((x) => x.code === garderie.value?.planEffectif))
const enEssai = computed(() => !!garderie.value?.essaiJusquau && new Date(garderie.value.essaiJusquau).getTime() > Date.now())
const message = ref('')
const erreur = ref('')
const paiementEnCours = ref('')

/** Forfaits vendus en ligne : au moins un prix Stripe configuré. */
const abonnables = computed(() =>
  forfaits.value.filter((x) => x.stripePrixMensuelId || x.stripePrixAnnuelId),
)
const statutStripe = computed(() => {
  const s = garderie.value?.stripeStatut
  if (!garderie.value?.stripeAbonnementId || !s) return null
  const libelles: Record<string, string> = {
    active: 'Abonnement actif',
    trialing: 'Abonnement en essai',
    past_due: 'Paiement en retard',
    unpaid: 'Paiement en retard',
    canceled: 'Abonnement résilié',
    incomplete: 'Paiement à compléter',
  }
  return { libelle: libelles[s] ?? `Abonnement : ${s}`, grave: s === 'past_due' || s === 'unpaid' }
})

async function rafraichirGarderie() {
  garderie.value = await api<Garderie>('/garderie')
}

onMounted(async () => {
  const [g] = await Promise.all([api<Garderie>('/garderie'), grille.charger()])
  garderie.value = g
  Object.assign(f, {
    nom: g.nom,
    adresse: g.adresse ?? '',
    telephone: g.telephone ?? '',
    courriel: g.courriel ?? '',
    heuresOuverture: g.heuresOuverture ?? '',
    fuseauHoraire: g.fuseauHoraire,
  })
  if (route.query.abonnement === 'succes') {
    notif.succes('Paiement confirmé. Votre nouveau forfait sera appliqué dans quelques instants.')
    setTimeout(rafraichirGarderie, 2500)
    router.replace({ query: {} })
  } else if (route.query.abonnement === 'annule') {
    notif.info('Paiement annulé. Aucun changement à votre forfait.')
    router.replace({ query: {} })
  }
})

async function enregistrer() {
  message.value = erreur.value = ''
  try {
    await api('/garderie', { method: 'PATCH', body: { ...f, courriel: f.courriel || undefined } })
    message.value = 'Paramètres enregistrés.'
    auth.chargerMoi()
  } catch (e) {
    erreur.value = (e as Error).message
  }
}

async function sAbonner(fo: Forfait, intervalle: 'mensuel' | 'annuel') {
  const cle = `${fo.code}:${intervalle}`
  paiementEnCours.value = cle
  try {
    const { url } = await api<{ url: string }>('/stripe/checkout', {
      method: 'POST',
      body: { code: fo.code, intervalle },
    })
    window.location.href = url
  } catch (e) {
    paiementEnCours.value = ''
    notif.erreur(e)
  }
}

async function ouvrirPortail() {
  paiementEnCours.value = 'portail'
  try {
    const { url } = await api<{ url: string }>('/stripe/portail', { method: 'POST' })
    window.location.href = url
  } catch (e) {
    paiementEnCours.value = ''
    notif.erreur(e)
  }
}
</script>

<template>
  <div class="conteneur" style="max-width: 680px">
    <h1>Paramètres de la garderie</h1>

    <div v-if="garderie" class="carte forfait">
      <div class="rangee" style="margin-bottom: 0.25rem">
        <h2 style="margin: 0">Forfait {{ garderie.planEffectifNom }}</h2>
        <span v-if="enEssai" class="badge orange">Essai jusqu'au {{ formaterDate(garderie.essaiJusquau!) }}</span>
        <span v-else-if="statutStripe" class="badge" :class="statutStripe.grave ? 'rouge' : 'vert'">{{ statutStripe.libelle }}</span>
        <span class="espace" />
        <span v-if="forfaitActuel" class="prix-actuel">
          {{ forfaitActuel.prixAPartirDe ? 'à partir de ' : '' }}{{ formaterPrix(forfaitActuel.prixMensuel) }}<small> / mois</small>
        </span>
      </div>
      <p class="petit doux">
        <template v-if="enEssai">
          Pendant l'essai, vous profitez du forfait {{ garderie.planEffectifNom }}. Ensuite, votre garderie passera au forfait {{ garderie.planNom }}.
        </template>
        <template v-else>{{ forfaitActuel?.description }}</template>
      </p>
      <div v-if="garderie.stripeAbonnementId" class="rangee abonnement-info">
        <span v-if="garderie.payeJusquau" class="petit doux">
          Période payée jusqu'au {{ formaterDate(garderie.payeJusquau) }}.
        </span>
        <button type="button" class="btn secondaire petit" :disabled="!!paiementEnCours" @click="ouvrirPortail">
          {{ paiementEnCours === 'portail' ? 'Ouverture…' : 'Carte, factures et annulation' }}
        </button>
      </div>
      <div v-if="statutStripe?.grave" class="alerte erreur" style="margin-top: 0.75rem">
        Le dernier paiement a échoué. Mettez à jour votre carte pour conserver le forfait {{ garderie.planEffectifNom }}.
      </div>
      <div class="jauges">
        <JaugeUtilisation libelle="Enfants actifs" :utilise="garderie.utilisation.enfants" :max="garderie.limites.maxEnfants" />
        <JaugeUtilisation libelle="Personnel (invitations comprises)" :utilise="garderie.utilisation.personnel" :max="garderie.limites.maxPersonnel" />
      </div>
      <p v-if="!garderie.fonctionnalites.includes('photos')" class="petit doux" style="margin: 0.9rem 0 0">
        Le partage de photos est inclus avec : {{ grille.nomsAvec('photos').join(', ') || 'un forfait payant' }}.
      </p>

      <details class="comparer">
        <summary>Comparer les forfaits</summary>
        <div class="liste-forfaits">
          <div v-for="fo in forfaits" :key="fo.code" class="mini-forfait" :class="{ actuel: fo.code === garderie.planEffectif }">
            <div class="rangee">
              <strong>{{ fo.nom }}</strong>
              <span v-if="fo.code === garderie.planEffectif" class="badge vert">Actuel</span>
            </div>
            <div class="prix-mini">
              {{ fo.prixAPartirDe ? 'dès ' : '' }}{{ formaterPrix(fo.prixMensuel) }}<small> / mois</small>
            </div>
            <ul>
              <li v-for="pt in fo.points" :key="pt">{{ pt }}</li>
            </ul>
            <div v-if="fo.code !== garderie.planEffectif && (fo.stripePrixMensuelId || fo.stripePrixAnnuelId)" class="choix-abonnement">
              <button
                v-if="fo.stripePrixMensuelId"
                type="button"
                class="btn petit"
                :disabled="!!paiementEnCours"
                @click="sAbonner(fo, 'mensuel')"
              >
                {{ paiementEnCours === `${fo.code}:mensuel` ? 'Redirection…' : `${formaterPrix(fo.prixMensuel)} / mois` }}
              </button>
              <button
                v-if="fo.stripePrixAnnuelId && fo.prixAnnuel"
                type="button"
                class="btn secondaire petit"
                :disabled="!!paiementEnCours"
                @click="sAbonner(fo, 'annuel')"
              >
                {{ paiementEnCours === `${fo.code}:annuel` ? 'Redirection…' : `${formaterPrix(fo.prixAnnuel)} / an` }}
              </button>
            </div>
          </div>
        </div>
        <p class="petit doux" style="margin: 0.75rem 0 0">
          {{ grille.parametres?.mentionTaxes }}
          <template v-if="abonnables.length">Paiement sécurisé par Stripe. Le changement de forfait est appliqué dès la confirmation du paiement.</template>
          <template v-else>Pour changer de forfait, écrivez-nous : le changement est appliqué le jour même.</template>
        </p>
      </details>
    </div>

    <form class="carte" @submit.prevent="enregistrer">
      <label class="champ"><span>Nom</span><input v-model="f.nom" required maxlength="150" /></label>
      <label class="champ"><span>Adresse</span><input v-model="f.adresse" maxlength="255" /></label>
      <div class="deux-colonnes">
        <label class="champ"><span>Téléphone</span><input v-model="f.telephone" type="tel" maxlength="30" /></label>
        <label class="champ"><span>Courriel</span><input v-model="f.courriel" type="email" /></label>
        <label class="champ"><span>Heures d'ouverture</span><input v-model="f.heuresOuverture" placeholder="Ex. : 7 h à 18 h" maxlength="100" /></label>
        <label class="champ">
          <span>Fuseau horaire</span>
          <select v-model="f.fuseauHoraire">
            <option v-for="z in FUSEAUX" :key="z" :value="z">{{ z }}</option>
          </select>
        </label>
      </div>
      <div v-if="message" class="alerte">{{ message }}</div>
      <div v-if="erreur" class="alerte erreur">{{ erreur }}</div>
      <button class="btn">Enregistrer</button>
    </form>
  </div>
</template>

<style scoped>
.forfait {
  margin-bottom: 1rem;
}
.prix-actuel {
  font-size: 1.15rem;
  font-weight: 650;
  letter-spacing: -0.02em;
}
.prix-actuel small,
.prix-mini small {
  font-size: 0.78rem;
  font-weight: 400;
  color: var(--c-texte-doux);
}
.jauges {
  display: grid;
  gap: 0.9rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  margin-top: 0.9rem;
}
.comparer {
  margin-top: 1.1rem;
  border-top: 1px solid var(--c-bord);
  padding-top: 0.9rem;
}
.comparer summary {
  cursor: pointer;
  font-weight: 550;
  font-size: 0.9rem;
  color: var(--c-primaire);
}
.liste-forfaits {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  margin-top: 0.9rem;
}
.mini-forfait {
  border: 1px solid var(--c-bord);
  border-radius: 10px;
  padding: 0.8rem;
  font-size: 0.82rem;
}
.mini-forfait.actuel {
  border-color: var(--c-primaire);
  box-shadow: 0 0 0 1px var(--c-primaire);
}
.prix-mini {
  font-size: 1.05rem;
  font-weight: 650;
  margin: 0.25rem 0 0.5rem;
}
.mini-forfait ul {
  margin: 0;
  padding-left: 1rem;
  color: #475569;
  display: grid;
  gap: 0.2rem;
}
.abonnement-info {
  margin-top: 0.6rem;
  align-items: center;
  gap: 0.75rem;
}
.choix-abonnement {
  display: grid;
  gap: 0.4rem;
  margin-top: 0.7rem;
}
.choix-abonnement .btn {
  width: 100%;
  justify-content: center;
}
</style>
