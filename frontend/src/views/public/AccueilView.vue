<script setup lang="ts">
import { RouterLink } from 'vue-router'
import IconeEntree from '@/components/IconeEntree.vue'
import type { TypeEntree } from '@/api/types'

const atouts: { type: TypeEntree; titre: string; texte: string }[] = [
  { type: 'ACTIVITE', titre: 'Activités', texte: 'Partagez les bricolages, les jeux et les sorties de la journée.' },
  { type: 'REPAS', titre: 'Repas', texte: 'Indiquez le menu et ce que chaque enfant a mangé, en deux touches.' },
  { type: 'SIESTE', titre: 'Siestes', texte: 'Notez le début et la fin de la sieste : la durée est calculée.' },
  { type: 'PHOTO', titre: 'Photos', texte: 'Des photos privées, visibles uniquement par les parents concernés.' },
  { type: 'REMARQUE', titre: 'Remarques', texte: 'Informez les parents des petits et grands moments.' },
  { type: 'ARRIVEE', titre: 'Présences', texte: "Suivez les arrivées et les départs de chaque enfant." },
]

const apercu: { type: TypeEntree; heure: string; texte: string }[] = [
  { type: 'ARRIVEE', heure: '8 h 05', texte: 'Emma est arrivée — avec Maman' },
  { type: 'REPAS', heure: '9 h 30', texte: 'Collation : pommes et biscuits — bien mangé' },
  { type: 'ACTIVITE', heure: '10 h 15', texte: 'Peinture avec les Explorateurs' },
  { type: 'SIESTE', heure: '12 h 45', texte: 'Sieste commencée' },
]
</script>

<template>
  <section class="heros">
    <div class="conteneur interieur">
      <div class="texte">
        <span class="sur-titre">Pour les garderies et leurs familles</span>
        <h1>La journée de votre enfant, en temps réel.</h1>
        <p class="sous-titre">
          Garderie 2027 permet aux garderies de partager avec les parents les activités, les repas, les siestes, les
          remarques et les photos de chaque enfant.
        </p>
        <div class="rangee">
          <RouterLink to="/inscription" class="btn">Créer ma garderie gratuitement</RouterLink>
          <RouterLink to="/connexion" class="btn secondaire">J'ai déjà un compte</RouterLink>
        </div>
        <p class="doux petit" style="margin-top: 1rem">Gratuit pour commencer · En français · Sur téléphone, tablette et ordinateur</p>
      </div>

      <div class="apercu carte" aria-hidden="true">
        <div class="apercu-tete">
          <span class="rond" />
          <div><strong>Emma</strong><br /><small class="doux">Les Explorateurs</small></div>
          <span class="badge vert" style="margin-left: auto">Présente</span>
        </div>
        <div v-for="(e, i) in apercu" :key="i" class="apercu-ligne">
          <IconeEntree :type="e.type" :taille="30" />
          <div class="petit"><strong>{{ e.heure }}</strong> · {{ e.texte }}</div>
        </div>
      </div>
    </div>
  </section>

  <section class="conteneur">
    <div class="grille">
      <div v-for="a in atouts" :key="a.titre" class="carte rangee" style="align-items: flex-start; flex-wrap: nowrap">
        <IconeEntree :type="a.type" :taille="44" />
        <div>
          <h3>{{ a.titre }}</h3>
          <p class="doux" style="margin: 0">{{ a.texte }}</p>
        </div>
      </div>
    </div>

    <h2 class="centre" style="margin: 3rem 0 1.25rem">Comment ça marche</h2>
    <div class="grille">
      <div class="carte etape">
        <span class="num">1</span>
        <h3>Créez votre garderie</h3>
        <p class="doux">Deux minutes suffisent. Invitez ensuite vos éducatrices : chacune reçoit un lien pour créer son compte.</p>
      </div>
      <div class="carte etape">
        <span class="num">2</span>
        <h3>Inscrivez les enfants</h3>
        <p class="doux">Fiche complète : allergies, contacts d'urgence, consentement photo. L'enfant est placé dans le groupe de son âge automatiquement.</p>
      </div>
      <div class="carte etape">
        <span class="num">3</span>
        <h3>Invitez les parents</h3>
        <p class="doux">Ils suivent la journée de leur enfant en direct : repas, sieste, activités et photos — et rien d'autre.</p>
      </div>
    </div>

    <div class="grille" style="margin-top: 2rem">
      <div class="carte">
        <h2>Pour les garderies</h2>
        <p class="doux">Le journal se remplit en quelques touches, sur tablette ou téléphone, même pour tout un groupe à la fois.</p>
      </div>
      <div class="carte">
        <h2>Pour les parents</h2>
        <p class="doux">Une invitation de votre garderie, et vous consultez la journée de votre enfant où que vous soyez.</p>
      </div>
      <div class="carte">
        <h2>Vie privée</h2>
        <p class="doux">Chaque garderie est isolée, les photos ne sont jamais publiques et le consentement des parents est respecté.</p>
      </div>
    </div>

    <div class="bandeau">
      <div>
        <h2>Prêt à essayer ?</h2>
        <p>Créez votre garderie maintenant : c'est gratuit pour démarrer.</p>
      </div>
      <RouterLink to="/inscription" class="btn grand">Créer ma garderie</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.heros {
  background:
    radial-gradient(600px 320px at 85% 10%, rgb(255 143 94 / 0.18), transparent 60%),
    radial-gradient(700px 400px at 10% 0%, rgb(124 92 240 / 0.16), transparent 60%),
    linear-gradient(160deg, #f3efff, #fdf6f0 80%);
  border-bottom: 1px solid var(--c-bord);
  padding: 3.5rem 0 3rem;
  margin-bottom: 2.5rem;
}
.interieur {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 2.5rem;
  align-items: center;
}
.sur-titre {
  display: inline-block;
  background: var(--c-primaire-clair);
  color: var(--c-primaire-fonce);
  font-weight: 800;
  font-size: 0.85rem;
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  margin-bottom: 1rem;
}
.heros h1 {
  font-size: clamp(1.9rem, 4.5vw, 2.9rem);
  font-weight: 900;
  letter-spacing: -0.01em;
  max-width: 560px;
}
.sous-titre {
  font-size: 1.1rem;
  max-width: 540px;
  color: var(--c-texte-doux);
  margin-bottom: 1.5rem;
}
.apercu {
  padding: 1.1rem;
  transform: rotate(1.2deg);
}
.apercu-tete {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid var(--c-bord);
  margin-bottom: 0.6rem;
}
.rond {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #8b5cf6;
  color: #fff;
  flex-shrink: 0;
}
.apercu-ligne {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.45rem 0;
}
.etape {
  position: relative;
}
.num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7c5cf0, var(--c-primaire-fonce));
  color: #fff;
  font-weight: 900;
  margin-bottom: 0.6rem;
}
.bandeau {
  margin-top: 3rem;
  border-radius: 24px;
  padding: 2.25rem;
  background: linear-gradient(135deg, #7c5cf0, var(--c-primaire-fonce));
  color: #fff;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  box-shadow: 0 16px 40px rgb(106 79 216 / 0.35);
}
.bandeau h2 {
  margin: 0;
}
.bandeau p {
  margin: 0.25rem 0 0;
  opacity: 0.9;
}
.bandeau .btn {
  background: #fff;
  color: var(--c-primaire-fonce);
  box-shadow: none;
}
.btn.grand {
  padding: 0.8rem 1.5rem;
  font-size: 1.05rem;
}
@media (max-width: 860px) {
  .interieur {
    grid-template-columns: 1fr;
  }
  .apercu {
    transform: none;
    max-width: 420px;
  }
  .heros {
    padding: 2.25rem 0;
  }
}
</style>
