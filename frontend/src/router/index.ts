import { createRouter, createWebHistory } from 'vue-router'
import type { Role } from '@/api/types'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    invite?: boolean
    roles?: Role[]
    superAdmin?: boolean
    titre?: string
  }
}

const PERSONNEL: Role[] = ['ADMIN', 'GESTIONNAIRE']

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: () => import('@/views/public/AccueilView.vue'), meta: { public: true, invite: true } },
    { path: '/inscription', component: () => import('@/views/public/InscriptionView.vue'), meta: { public: true, invite: true, titre: 'Créer ma garderie' } },
    { path: '/connexion', component: () => import('@/views/public/ConnexionView.vue'), meta: { public: true, invite: true, titre: 'Connexion' } },
    { path: '/mot-de-passe-oublie', component: () => import('@/views/public/MotDePasseOublieView.vue'), meta: { public: true, titre: 'Mot de passe oublié' } },
    { path: '/reinitialiser-mot-de-passe', component: () => import('@/views/public/ReinitialiserView.vue'), meta: { public: true, titre: 'Nouveau mot de passe' } },
    { path: '/invitation/:jeton', component: () => import('@/views/public/InvitationView.vue'), meta: { public: true, titre: 'Invitation' } },

    { path: '/garderie', redirect: '/garderie/aujourd-hui' },
    { path: '/garderie/aujourd-hui', component: () => import('@/views/garderie/AujourdhuiView.vue'), meta: { roles: PERSONNEL, titre: "Aujourd'hui" } },
    { path: '/garderie/enfants', component: () => import('@/views/garderie/EnfantsView.vue'), meta: { roles: PERSONNEL, titre: 'Enfants' } },
    { path: '/garderie/enfants/nouveau', component: () => import('@/views/garderie/EnfantFormView.vue'), meta: { roles: PERSONNEL, titre: 'Inscrire un enfant' } },
    { path: '/garderie/enfants/:id', component: () => import('@/views/garderie/EnfantDetailView.vue'), meta: { roles: PERSONNEL, titre: 'Fiche enfant' } },
    { path: '/garderie/enfants/:id/modifier', component: () => import('@/views/garderie/EnfantFormView.vue'), meta: { roles: PERSONNEL, titre: 'Modifier la fiche' } },
    { path: '/garderie/photos', component: () => import('@/views/garderie/PhotosView.vue'), meta: { roles: PERSONNEL, titre: 'Photos' } },
    { path: '/garderie/groupes', component: () => import('@/views/garderie/GroupesView.vue'), meta: { roles: ['ADMIN'], titre: 'Groupes' } },
    { path: '/garderie/personnel', component: () => import('@/views/garderie/PersonnelView.vue'), meta: { roles: ['ADMIN'], titre: 'Personnel' } },
    { path: '/garderie/parametres', component: () => import('@/views/garderie/ParametresView.vue'), meta: { roles: ['ADMIN'], titre: 'Paramètres' } },

    { path: '/parent', component: () => import('@/views/parent/ParentAccueilView.vue'), meta: { roles: ['PARENT'], titre: 'Mes enfants' } },
    { path: '/parent/enfants/:id', component: () => import('@/views/parent/ParentEnfantView.vue'), meta: { roles: ['PARENT'], titre: 'Journée' } },

    { path: '/profil', component: () => import('@/views/ProfilView.vue'), meta: { titre: 'Mon profil' } },
    { path: '/admin/garderies', component: () => import('@/views/admin/AdminGarderiesView.vue'), meta: { superAdmin: true, titre: 'Garderies' } },
    { path: '/admin/forfaits', component: () => import('@/views/admin/AdminForfaitsView.vue'), meta: { superAdmin: true, titre: 'Forfaits et prix' } },
    { path: '/:pathMatch(.*)*', component: () => import('@/views/IntrouvableView.vue'), meta: { public: true, titre: 'Page introuvable' } },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.charge) await auth.chargerMoi()

  if (to.meta.public) {
    if (to.meta.invite && auth.connecte) return auth.accueil
    return true
  }
  if (!auth.connecte) return { path: '/connexion', query: { suite: to.fullPath } }
  if (to.meta.superAdmin && !auth.moi?.estSuperAdmin) return auth.accueil
  if (to.meta.roles && (!auth.role || !to.meta.roles.includes(auth.role))) return auth.accueil
  return true
})

router.afterEach((to) => {
  document.title = to.meta.titre ? `${to.meta.titre} — Garderie 2027` : 'Garderie 2027'
})

export default router
