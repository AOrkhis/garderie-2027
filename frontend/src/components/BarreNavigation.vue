<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { initiales, ROLES } from '@/utils/format'
import IconeNav from './IconeNav.vue'
import LogoMarque from './LogoMarque.vue'

const auth = useAuthStore()
const router = useRouter()

const liens = computed(() => {
  if (auth.estPersonnel)
    return [
      { a: '/garderie/aujourd-hui', libelle: "Aujourd'hui", icone: 'aujourdhui' },
      { a: '/garderie/enfants', libelle: 'Enfants', icone: 'enfants' },
      { a: '/garderie/photos', libelle: 'Photos', icone: 'photos' },
      ...(auth.estAdmin
        ? [
            { a: '/garderie/groupes', libelle: 'Groupes', icone: 'groupes' },
            { a: '/garderie/personnel', libelle: 'Personnel', icone: 'personnel' },
            { a: '/garderie/parametres', libelle: 'Paramètres', icone: 'parametres' },
          ]
        : []),
    ]
  if (auth.estParent) return [{ a: '/parent', libelle: 'Mes enfants', icone: 'accueil' }]
  if (auth.moi?.estSuperAdmin) return [{ a: '/admin/garderies', libelle: 'Plateforme', icone: 'plateforme' }]
  return []
})

const onglets = computed(() => {
  const base = [...liens.value]
  if (auth.estParent) base.push({ a: '/profil', libelle: 'Profil', icone: 'profil' })
  return base
})

async function changer(e: Event) {
  await auth.changerAdhesion(Number((e.target as HTMLSelectElement).value))
  router.push(auth.accueil)
}

function deconnexion() {
  auth.deconnexion()
  router.push('/connexion')
}
</script>

<template>
  <!-- Barre du haut : visiteurs (toujours) et utilisateurs connectés (mobile) -->
  <header class="topbar">
    <RouterLink :to="auth.connecte ? auth.accueil : '/'" class="logo">
      <LogoMarque :taille="30" />
      <span class="nom">Garderie&nbsp;2027</span>
    </RouterLink>

    <template v-if="auth.connecte">
      <span class="espace" />
      <span class="garderie-nom doux petit">{{ auth.adhesionCourante?.garderie.nom }}</span>
      <RouterLink
        v-if="auth.moi?.estSuperAdmin"
        to="/admin/garderies"
        class="bouton-icone plateforme"
        title="Plateforme"
        aria-label="Plateforme"
      >
        <IconeNav nom="plateforme" :taille="20" />
      </RouterLink>
      <RouterLink to="/profil" class="avatar-mini" aria-label="Mon profil">{{ initiales(auth.moi!) }}</RouterLink>
      <button class="bouton-icone" aria-label="Déconnexion" @click="deconnexion"><IconeNav nom="deconnexion" :taille="20" /></button>
    </template>
    <template v-else>
      <span class="espace" />
      <RouterLink to="/connexion" class="btn secondaire petit">Connexion</RouterLink>
      <RouterLink to="/inscription" class="btn petit">S'inscrire</RouterLink>
    </template>
  </header>

  <!-- Barre latérale : tablette (rail) et ordinateur -->
  <nav v-if="auth.connecte" class="rail" aria-label="Navigation principale">
    <RouterLink :to="auth.accueil" class="logo">
      <LogoMarque :taille="34" />
      <span>Garderie&nbsp;2027</span>
    </RouterLink>

    <select
      v-if="(auth.moi?.adhesions.length ?? 0) > 1"
      class="choix-garderie"
      :value="auth.moi?.adhesionCourante ?? ''"
      aria-label="Changer de garderie"
      @change="changer"
    >
      <option v-for="a in auth.moi?.adhesions" :key="a.id" :value="a.id">
        {{ a.garderie.nom }} — {{ ROLES[a.role] }}
      </option>
    </select>
    <div v-else-if="auth.adhesionCourante" class="nom-garderie">{{ auth.adhesionCourante.garderie.nom }}</div>

    <div class="liens">
      <RouterLink v-for="l in liens" :key="l.a" :to="l.a">
        <IconeNav :nom="l.icone" :taille="22" />
        <span>{{ l.libelle }}</span>
      </RouterLink>
      <RouterLink v-if="auth.estParent" to="/profil"><IconeNav nom="profil" :taille="22" /><span>Profil</span></RouterLink>
      <RouterLink v-if="auth.moi?.estSuperAdmin && (auth.estPersonnel || auth.estParent)" to="/admin/garderies" class="lien-plateforme">
        <IconeNav nom="plateforme" :taille="22" />
        <span>Plateforme</span>
      </RouterLink>
    </div>

    <div class="pied-rail">
      <RouterLink to="/profil" class="utilisateur">
        <span class="avatar-mini">{{ initiales(auth.moi!) }}</span>
        <span class="qui">
          <strong>{{ auth.moi?.prenom }} {{ auth.moi?.nom }}</strong>
          <small class="doux">{{ auth.role ? ROLES[auth.role] : 'Super admin' }}</small>
        </span>
      </RouterLink>
      <button class="bouton-icone" aria-label="Déconnexion" title="Déconnexion" @click="deconnexion">
        <IconeNav nom="deconnexion" :taille="20" />
      </button>
    </div>
  </nav>

  <!-- Barre d'onglets en bas : mobile -->
  <nav v-if="auth.connecte" class="tabs" aria-label="Navigation principale">
    <RouterLink v-for="l in onglets" :key="l.a" :to="l.a">
      <IconeNav :nom="l.icone" :taille="22" />
      <span>{{ l.libelle }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
/* ---------- Barre du haut ---------- */
.topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  height: 56px;
  padding: 0 1rem;
  background: rgb(255 255 255 / 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--c-bord);
}
.topbar .logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 900;
  font-size: 1.05rem;
  color: var(--c-texte);
  text-decoration: none;
}
.topbar .btn {
  white-space: nowrap;
}
@media (max-width: 399px) {
  .topbar .logo .nom {
    display: none;
  }
}
.espace {
  flex: 1;
}
.garderie-nom {
  max-width: 38vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.avatar-mini {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--c-primaire-clair);
  color: var(--c-primaire-fonce);
  font-weight: 800;
  font-size: 0.8rem;
  text-decoration: none;
  flex-shrink: 0;
}
.bouton-icone {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: none;
  background: none;
  color: var(--c-texte-doux);
  cursor: pointer;
}
.bouton-icone:hover {
  background: var(--c-danger-clair);
  color: var(--c-danger);
}
.bouton-icone.plateforme {
  color: var(--c-primaire);
}
.bouton-icone.plateforme:hover,
.bouton-icone.plateforme.router-link-active {
  background: var(--c-primaire-clair);
  color: var(--c-primaire-fonce);
}
.lien-plateforme {
  margin-top: 0.5rem;
  border-top: 1px solid var(--c-bord);
}

/* ---------- Barre latérale ---------- */
.rail {
  display: none;
}
.tabs {
  display: none;
}

/* ---------- Barre d'onglets (mobile) ---------- */
@media (max-width: 699px) {
  .tabs {
    display: flex;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    background: rgb(255 255 255 / 0.92);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid var(--c-bord);
    padding: 0.3rem 0.25rem calc(0.3rem + env(safe-area-inset-bottom));
  }
  .tabs a {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    padding: 0.4rem 0.1rem;
    text-decoration: none;
    color: var(--c-texte-doux);
    font-size: 0.63rem;
    font-weight: 800;
    border-radius: 10px;
  }
  .tabs a.router-link-active {
    color: var(--c-primaire);
  }
}

/* ---------- Tablette : rail d'icônes ---------- */
@media (min-width: 700px) {
  .topbar {
    display: none;
  }
  .rail {
    display: flex;
    flex-direction: column;
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 82px;
    z-index: 30;
    background: #fff;
    border-right: 1px solid var(--c-bord);
    padding: 0.9rem 0.6rem;
    gap: 0.9rem;
    overflow-y: auto;
    scrollbar-width: thin;
  }
  .rail .logo {
    display: flex;
    justify-content: center;
  }
  .rail .logo span,
  .rail .choix-garderie,
  .rail .nom-garderie,
  .rail .qui {
    display: none;
  }
  .rail .liens {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    flex: 1;
  }
  .rail .liens a {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.65rem 0.2rem;
    border-radius: 12px;
    text-decoration: none;
    color: var(--c-texte-doux);
    font-size: 0.63rem;
    font-weight: 800;
    text-align: center;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .rail .liens a:hover {
    background: var(--c-primaire-clair);
    color: var(--c-primaire-fonce);
  }
  .rail .liens a.router-link-active {
    background: var(--c-primaire-clair);
    color: var(--c-primaire-fonce);
  }
  .rail .pied-rail {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  :global(.appli.connecte .zone) {
    margin-left: 82px;
  }
}

/* ---------- Ordinateur : barre latérale complète ---------- */
@media (min-width: 1100px) {
  .rail {
    width: 248px;
    padding: 1.25rem 0.9rem;
  }
  .rail .logo {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.6rem;
    font-weight: 900;
    font-size: 1.15rem;
    color: var(--c-texte);
    text-decoration: none;
    padding: 0 0.4rem;
  }
  .rail .logo span {
    display: inline;
  }
  .rail .choix-garderie {
    display: block;
    font-size: 0.85rem;
    padding: 0.5rem;
  }
  .rail .nom-garderie {
    display: block;
    font-weight: 800;
    font-size: 0.9rem;
    color: var(--c-primaire-fonce);
    background: var(--c-primaire-clair);
    border-radius: 10px;
    padding: 0.5rem 0.7rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .rail .liens a {
    flex-direction: row;
    justify-content: flex-start;
    gap: 0.7rem;
    padding: 0.7rem 0.8rem;
    font-size: 0.95rem;
  }
  .rail .liens a.router-link-active {
    background: linear-gradient(135deg, #7c5cf0, var(--c-primaire) 60%, var(--c-primaire-fonce));
    color: #fff;
    box-shadow: 0 4px 12px rgb(106 79 216 / 0.35);
  }
  .rail .pied-rail {
    flex-direction: row;
    justify-content: space-between;
    border-top: 1px solid var(--c-bord);
    padding-top: 0.8rem;
  }
  .rail .utilisateur {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    text-decoration: none;
    color: inherit;
    min-width: 0;
  }
  .rail .qui {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
    min-width: 0;
  }
  .rail .qui strong {
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .rail .qui small {
    font-size: 0.75rem;
  }
  :global(.appli.connecte .zone) {
    margin-left: 248px;
  }
}
</style>
