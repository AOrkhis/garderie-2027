<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '@/api/client'
import type { Forfait } from '@/api/types'
import { formaterPrix } from '@/utils/format'
import IconeEntree from '@/components/IconeEntree.vue'
import LogoMarque from '@/components/LogoMarque.vue'
import type { TypeEntree } from '@/api/types'

const atouts: { type: TypeEntree; titre: string; texte: string }[] = [
  { type: 'ARRIVEE', titre: 'Présences', texte: "Arrivées et départs en une touche, avec l'heure et la personne autorisée." },
  { type: 'REPAS', titre: 'Repas', texte: 'Le menu une fois, la quantité pour chaque enfant — ou pour tout le groupe.' },
  { type: 'SIESTE', titre: 'Siestes', texte: 'Début et réveil en un geste ; la durée est calculée automatiquement.' },
  { type: 'HYGIENE', titre: 'Hygiène', texte: "Changes de couche et passages aux toilettes, horodatés et comptés." },
  { type: 'ACTIVITE', titre: 'Activités', texte: 'Bricolages, jeux et sorties partagés avec les familles concernées.' },
  { type: 'PHOTO', titre: 'Photos privées', texte: 'Visibles uniquement par les parents des enfants identifiés.' },
]

const forfaits = ref<Forfait[]>([])
onMounted(async () => {
  forfaits.value = await api<Forfait[]>('/forfaits').catch(() => [])
})

const lignes = [
  { nom: 'Emma L.', couleur: '#4f46e5', arrivee: '8 h 05', repas: 'TOUT', sieste: 'Dort · 12 h 40', change: '2×' },
  { nom: 'Noah T.', couleur: '#059669', arrivee: '8 h 20', repas: 'BIEN', sieste: '1 h 15', change: '3×' },
  { nom: 'Léa M.', couleur: '#db2777', arrivee: '8 h 42', repas: 'UN_PEU', sieste: 'Dort · 12 h 55', change: '1×' },
  { nom: 'Adam B.', couleur: '#ea580c', arrivee: '9 h 10', repas: '', sieste: '—', change: '—' },
]
const QUANT: [string, string][] = [
  ['TOUT', 'Tout'],
  ['BIEN', 'Bien'],
  ['UN_PEU', 'Peu'],
  ['RIEN', 'Rien'],
]
</script>

<template>
  <div class="accueil">
    <!-- En-tête (ordinateur) -->
    <header class="nav-publique">
      <div class="conteneur large rangee">
        <RouterLink to="/" class="marque"><LogoMarque :taille="28" /> Garderie 2027</RouterLink>
        <nav class="liens-nav">
          <a href="#fonctionnalites">Fonctionnalités</a>
          <a href="#etapes">Démarrer</a>
          <a href="#forfaits">Forfaits</a>
        </nav>
        <span class="espace" />
        <RouterLink to="/connexion" class="btn lien">Connexion</RouterLink>
        <RouterLink to="/inscription" class="btn">Essai gratuit</RouterLink>
      </div>
    </header>

    <!-- Héros -->
    <section class="heros">
      <div class="conteneur large">
        <div class="texte-heros">
          <span class="sur-titre"><span class="point" /> Conçu pour les garderies du Québec</span>
          <h1>Le journal de bord de votre garderie, rempli en quelques secondes.</h1>
          <p class="sous-titre">
            Présences, repas, siestes, changes et photos : vos éducatrices notent tout depuis une seule grille, et les
            parents suivent la journée de leur enfant en temps réel.
          </p>
          <div class="ctas">
            <RouterLink to="/inscription" class="btn grand">Créer ma garderie</RouterLink>
            <RouterLink to="/connexion" class="btn secondaire grand">Se connecter</RouterLink>
          </div>
          <p class="mention">30 jours de Pro offerts · Sans carte de crédit · Entièrement en français</p>
        </div>

        <!-- Aperçu du produit -->
        <div class="maquette" aria-hidden="true">
          <div class="maquette-barre">
            <span /><span /><span />
            <div class="url">garderie2027.app/aujourd-hui</div>
          </div>
          <div class="maquette-corps">
            <div class="maquette-tete">
              <div>
                <strong>Aujourd'hui</strong>
                <small>Les Explorateurs · 4 présents</small>
              </div>
              <div class="seg"><span class="on">Dîner</span><span>Coll. PM</span></div>
            </div>
            <div class="m-ligne m-entete">
              <span>Enfant</span><span>Arrivée</span><span>Dîner</span><span>Sieste</span><span>Changes</span>
            </div>
            <div v-for="l in lignes" :key="l.nom" class="m-ligne">
              <span class="m-enfant"><i :style="{ background: l.couleur }">{{ l.nom.charAt(0) }}</i>{{ l.nom }}</span>
              <span class="m-vert">{{ l.arrivee }}</span>
              <span class="m-quant">
                <b v-for="[k, t] in QUANT" :key="k" :class="{ [`q-${k.toLowerCase()}`]: l.repas === k }">{{ t }}</b>
              </span>
              <span :class="{ 'm-dort': l.sieste.startsWith('Dort') }">{{ l.sieste }}</span>
              <span class="doux">{{ l.change }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Chiffres -->
    <section class="conteneur large chiffres">
      <div><strong>1 touche</strong><span>pour noter un repas, une sieste ou un change</span></div>
      <div><strong>Tout le groupe</strong><span>en une seule action, avec annulation</span></div>
      <div><strong>100 % privé</strong><span>chaque famille ne voit que ses enfants</span></div>
    </section>

    <!-- Fonctionnalités -->
    <section id="fonctionnalites" class="conteneur large section">
      <div class="titre-section">
        <span class="eyebrow">Fonctionnalités</span>
        <h2>Tout le quotidien, au même endroit</h2>
        <p class="doux">Pensé avec des éducatrices : grands boutons, aucune saisie inutile, utilisable d'une main.</p>
      </div>
      <div class="atouts">
        <div v-for="a in atouts" :key="a.titre" class="atout">
          <span class="icone"><IconeEntree :type="a.type" :taille="40" /></span>
          <h3>{{ a.titre }}</h3>
          <p class="doux">{{ a.texte }}</p>
        </div>
      </div>
    </section>

    <!-- Étapes -->
    <section id="etapes" class="bande-grise">
      <div class="conteneur large section">
        <div class="titre-section">
          <span class="eyebrow">Démarrer</span>
          <h2>Opérationnel en une matinée</h2>
        </div>
        <ol class="etapes">
          <li>
            <span class="num">1</span>
            <h3>Créez votre garderie</h3>
            <p class="doux">Deux minutes. Invitez ensuite votre personnel : chacun reçoit un lien pour créer son compte.</p>
          </li>
          <li>
            <span class="num">2</span>
            <h3>Inscrivez les enfants</h3>
            <p class="doux">Allergies, contacts d'urgence, consentement photo. Le groupe d'âge est attribué automatiquement.</p>
          </li>
          <li>
            <span class="num">3</span>
            <h3>Invitez les parents</h3>
            <p class="doux">Ils suivent la journée de leur enfant en direct — et uniquement celle de leur enfant.</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- Forfaits -->
    <section id="forfaits" class="conteneur large section">
      <div class="titre-section">
        <span class="eyebrow">Forfaits</span>
        <h2>Commencez gratuitement</h2>
        <p class="doux">Chaque nouvelle garderie profite du forfait Pro pendant 30 jours, sans carte de crédit.</p>
      </div>
      <div class="forfaits">
        <div v-for="fo in forfaits" :key="fo.plan" class="forfait" :class="{ vedette: fo.plan === 'PRO' }">
          <span v-if="fo.plan === 'PRO'" class="etiquette-vedette">Le plus populaire</span>
          <h3>{{ fo.nom }}</h3>
          <p class="prix">
            <small v-if="fo.prixAPartirDe">dès </small>{{ formaterPrix(fo.prixMensuel) }} <small>/ mois</small>
          </p>
          <p class="annuel">
            {{ fo.prixAnnuel ? `ou ${formaterPrix(fo.prixAnnuel)} / an — 2 mois offerts` : fo.prixAPartirDe ? 'Contrat annuel personnalisé' : 'Pour toujours' }}
          </p>
          <p class="doux desc">{{ fo.description }}</p>
          <ul>
            <li v-for="pt in fo.points" :key="pt">{{ pt }}</li>
          </ul>
          <RouterLink to="/inscription" class="btn bloc" :class="{ secondaire: fo.plan !== 'PRO' }">
            {{ fo.plan === 'SUR_MESURE' ? 'Nous contacter' : fo.plan === 'GRATUIT' ? 'Commencer' : 'Essayer 30 jours' }}
          </RouterLink>
        </div>
      </div>
      <p class="doux petit taxes">Prix en dollars canadiens, avant TPS et TVQ.</p>
    </section>

    <!-- Appel final -->
    <section class="conteneur large">
      <div class="bandeau">
        <div>
          <h2>Prêt à simplifier vos journées ?</h2>
          <p>Créez votre garderie maintenant — vos éducatrices peuvent commencer dès aujourd'hui.</p>
        </div>
        <RouterLink to="/inscription" class="btn grand">Créer ma garderie</RouterLink>
      </div>
    </section>

    <footer class="pied">
      <div class="conteneur large rangee">
        <span class="marque petite"><LogoMarque :taille="22" /> Garderie 2027</span>
        <span class="espace" />
        <RouterLink to="/connexion">Connexion</RouterLink>
        <RouterLink to="/inscription">Inscription</RouterLink>
        <span class="doux">© {{ new Date().getFullYear() }} Garderie 2027</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.accueil {
  background: #fff;
}
.conteneur.large {
  max-width: 1180px;
}

/* ---------- Navigation publique (ordinateur) ---------- */
.nav-publique {
  display: none;
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgb(255 255 255 / 0.88);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--c-bord);
}
.nav-publique .conteneur {
  padding-top: 0.7rem;
  padding-bottom: 0.7rem;
  flex-wrap: nowrap;
  gap: 1rem;
}
.marque {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--c-texte);
  text-decoration: none;
}
.marque.petite {
  font-size: 0.9rem;
}
.liens-nav {
  display: flex;
  gap: 1.5rem;
  margin-left: 1.5rem;
}
.liens-nav a {
  color: var(--c-texte-doux);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
}
.liens-nav a:hover {
  color: var(--c-texte);
}
@media (min-width: 700px) {
  .nav-publique {
    display: block;
  }
}

/* ---------- Héros ---------- */
.heros {
  border-bottom: 1px solid var(--c-bord);
  background:
    linear-gradient(to bottom, rgb(255 255 255 / 0), #fff 85%),
    repeating-linear-gradient(0deg, transparent 0 39px, rgb(15 23 42 / 0.035) 39px 40px),
    repeating-linear-gradient(90deg, transparent 0 39px, rgb(15 23 42 / 0.035) 39px 40px);
}
.heros .conteneur {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  gap: 3rem;
  align-items: center;
  padding-top: 4.5rem;
  padding-bottom: 4.5rem;
}
.sur-titre {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid var(--c-bord);
  background: #fff;
  color: #334155;
  font-weight: 500;
  font-size: 0.8rem;
  border-radius: 999px;
  padding: 0.3rem 0.8rem;
  margin-bottom: 1.25rem;
  box-shadow: var(--ombre);
}
.point {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c-succes);
}
.heros h1 {
  font-size: clamp(2rem, 4.2vw, 3.1rem);
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.08;
  margin-bottom: 1.1rem;
}
.sous-titre {
  font-size: 1.1rem;
  line-height: 1.6;
  color: #475569;
  max-width: 540px;
  margin-bottom: 1.75rem;
}
.ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}
.btn.grand {
  padding: 0.75rem 1.35rem;
  font-size: 0.98rem;
  min-height: 46px;
}
.mention {
  margin-top: 1.1rem;
  font-size: 0.82rem;
  color: var(--c-texte-doux);
}

/* ---------- Maquette du produit ---------- */
.maquette {
  border: 1px solid var(--c-bord-fort);
  border-radius: 12px;
  background: #fff;
  box-shadow:
    0 1px 2px rgb(15 23 42 / 0.05),
    0 24px 60px -12px rgb(15 23 42 / 0.25);
  overflow: hidden;
  font-size: 0.78rem;
}
.maquette-barre {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0.55rem 0.75rem;
  background: var(--c-fond);
  border-bottom: 1px solid var(--c-bord);
}
.maquette-barre > span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e2e8f0;
}
.url {
  margin-left: 0.75rem;
  flex: 1;
  background: #fff;
  border: 1px solid var(--c-bord);
  border-radius: 6px;
  padding: 0.15rem 0.6rem;
  color: var(--c-texte-doux);
  font-size: 0.72rem;
}
.maquette-corps {
  padding: 0.9rem 0.9rem 0.5rem;
}
.maquette-tete {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}
.maquette-tete strong {
  display: block;
  font-size: 0.95rem;
}
.maquette-tete small {
  color: var(--c-texte-doux);
}
.seg {
  display: inline-flex;
  border: 1px solid var(--c-bord-fort);
  border-radius: 7px;
  padding: 2px;
  gap: 2px;
}
.seg span {
  padding: 0.15rem 0.5rem;
  border-radius: 5px;
  color: var(--c-texte-doux);
}
.seg .on {
  background: var(--c-primaire);
  color: #fff;
}
.m-ligne {
  display: grid;
  grid-template-columns: 1.3fr 0.8fr 1.6fr 1fr 0.6fr;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.25rem;
  border-top: 1px solid var(--c-bord);
  white-space: nowrap;
}
.m-entete {
  border-top: none;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--c-texte-doux);
  font-weight: 600;
}
.m-enfant {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 600;
}
.m-enfant i {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  color: #fff;
  font-style: normal;
  font-size: 0.65rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.m-vert {
  color: #047857;
  font-weight: 500;
}
.m-dort {
  color: #4338ca;
  font-weight: 500;
}
.m-quant {
  display: inline-flex;
  border: 1px solid var(--c-bord-fort);
  border-radius: 6px;
  overflow: hidden;
  width: fit-content;
}
.m-quant b {
  font-weight: 500;
  padding: 0.12rem 0.4rem;
  border-right: 1px solid var(--c-bord);
  color: #94a3b8;
}
.m-quant b:last-child {
  border-right: none;
}
.m-quant .q-tout {
  background: #059669;
  color: #fff;
}
.m-quant .q-bien {
  background: #10b981;
  color: #fff;
}
.m-quant .q-un_peu {
  background: #f59e0b;
  color: #fff;
}

/* ---------- Chiffres ---------- */
.chiffres {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  padding-top: 2.5rem;
  padding-bottom: 0.5rem;
}
.chiffres div {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding-left: 1rem;
  border-left: 2px solid var(--c-primaire);
}
.chiffres strong {
  font-size: 1.15rem;
  letter-spacing: -0.02em;
}
.chiffres span {
  color: var(--c-texte-doux);
  font-size: 0.9rem;
}

/* ---------- Sections ---------- */
.section {
  padding-top: 4.5rem;
  padding-bottom: 4.5rem;
}
.titre-section {
  max-width: 620px;
  margin-bottom: 2.5rem;
}
.eyebrow {
  display: block;
  color: var(--c-primaire);
  font-weight: 600;
  font-size: 0.82rem;
  margin-bottom: 0.5rem;
}
.titre-section h2 {
  font-size: clamp(1.5rem, 3vw, 2rem);
  letter-spacing: -0.03em;
  margin-bottom: 0.6rem;
}
.titre-section p {
  font-size: 1.02rem;
}
.atouts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2.25rem 2rem;
}
.atout .icone {
  display: inline-flex;
  margin-bottom: 0.8rem;
}
.atout h3 {
  font-size: 1rem;
  margin-bottom: 0.3rem;
}
.atout p {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.6;
}

.bande-grise {
  background: var(--c-fond);
  border-top: 1px solid var(--c-bord);
  border-bottom: 1px solid var(--c-bord);
}
.etapes {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
.etapes li {
  background: #fff;
  border: 1px solid var(--c-bord);
  border-radius: var(--rayon);
  padding: 1.5rem;
  box-shadow: var(--ombre);
}
.num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--c-primaire-clair);
  color: var(--c-primaire-fonce);
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.9rem;
}
.etapes h3 {
  font-size: 1rem;
}
.etapes p {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.6;
}

/* ---------- Forfaits ---------- */
.forfaits {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  align-items: stretch;
}
.annuel {
  font-size: 0.8rem;
  color: var(--c-texte-doux);
  margin: 0 0 0.75rem;
  min-height: 1.2em;
}
.desc {
  font-size: 0.88rem;
  margin-bottom: 0.25rem;
}
.taxes {
  margin-top: 1.25rem;
}
.forfait {
  position: relative;
  border: 1px solid var(--c-bord);
  border-radius: var(--rayon);
  padding: 1.5rem 1.35rem;
  box-shadow: var(--ombre);
  display: flex;
  flex-direction: column;
}
.forfait.vedette {
  border-color: var(--c-primaire);
  box-shadow:
    0 0 0 1px var(--c-primaire),
    var(--ombre-forte);
}
.etiquette-vedette {
  position: absolute;
  top: -11px;
  left: 1.75rem;
  background: var(--c-primaire);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 600;
  border-radius: 999px;
  padding: 0.15rem 0.65rem;
}
.prix {
  font-size: 1.9rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  margin: 0.25rem 0 0.4rem;
}
.prix small {
  font-size: 0.9rem;
  font-weight: 400;
  color: var(--c-texte-doux);
}
.forfait ul {
  list-style: none;
  margin: 0.75rem 0 1.5rem;
  padding: 0;
  display: grid;
  gap: 0.55rem;
  flex: 1;
  font-size: 0.92rem;
}
.forfait li {
  display: flex;
  gap: 0.55rem;
  align-items: flex-start;
}
.forfait li::before {
  content: '';
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 3px;
  border-radius: 50%;
  background: var(--c-succes-clair)
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 12l4 4 8-8' stroke='%23059669' stroke-width='3' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")
    center / 12px no-repeat;
}

/* ---------- Appel final ---------- */
.bandeau {
  border-radius: 16px;
  padding: 2.5rem;
  background: #0f172a;
  color: #fff;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  margin-bottom: 4rem;
}
.bandeau h2 {
  margin: 0;
  font-size: 1.45rem;
  letter-spacing: -0.025em;
}
.bandeau p {
  margin: 0.35rem 0 0;
  color: #cbd5e1;
}
.bandeau .btn {
  background: #fff;
  border-color: #fff;
  color: #0f172a;
}
.bandeau .btn:hover {
  background: #e2e8f0;
}

.pied {
  border-top: 1px solid var(--c-bord);
  font-size: 0.85rem;
}
.pied .conteneur {
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
  gap: 1.25rem;
}
.pied a {
  color: var(--c-texte-doux);
  text-decoration: none;
}
.pied a:hover {
  color: var(--c-texte);
}

/* ---------- Responsive ---------- */
@media (max-width: 960px) {
  .heros .conteneur {
    grid-template-columns: 1fr;
    padding-top: 3rem;
    padding-bottom: 3rem;
  }
  .atouts,
  .forfaits {
    grid-template-columns: repeat(2, 1fr);
  }
  .liens-nav {
    display: none;
  }
}
@media (max-width: 699px) {
  .heros .conteneur {
    padding-top: 2rem;
    padding-bottom: 2.5rem;
    gap: 2rem;
  }
  .ctas {
    flex-direction: column;
  }
  .ctas .btn {
    width: 100%;
  }
  .maquette {
    font-size: 0.7rem;
  }
  .m-ligne {
    grid-template-columns: 1.3fr 0.8fr 1.7fr 1fr;
  }
  .m-ligne > :nth-child(5) {
    display: none;
  }
  .chiffres,
  .atouts,
  .etapes,
  .forfaits {
    grid-template-columns: 1fr;
  }
  .atouts {
    gap: 1.75rem;
  }
  .section {
    padding-top: 3rem;
    padding-bottom: 3rem;
  }
  .bandeau {
    padding: 1.75rem 1.25rem;
    text-align: center;
    justify-content: center;
  }
  .bandeau .btn {
    width: 100%;
  }
  .pied .conteneur {
    justify-content: center;
    padding-bottom: 6rem;
  }
  .pied .espace {
    display: none;
  }
}
</style>
