# Garderie 2027 — notes pour les agents

SaaS pour garderies (tout en français). Spécifications : `CAHIER_DES_CHARGES.md`.

## Structure
- `backend/` — NestJS 10, TypeORM, MySQL. Préfixe API `/api`. Config dans `backend/.env` (jamais commité ; modèle : `.env.example`).
- `frontend/` — Vue 3 + Vite + Pinia + Vue Router. Le serveur Vite redirige `/api` vers `http://localhost:3000`.

## Commandes
- Backend : `cd backend && npm run start:dev` (port 3000). Le mode watch ne recharge pas `.env` : redémarrer après modification.
- Frontend : `cd frontend && npm run dev` (port 5173).
- Vérifications backend : `npx tsc --noEmit`, `npx eslint "src/**/*.ts"`, `npm test`.
- Vérifications frontend : `npm run build` (inclut `vue-tsc`), `npx oxlint .`, `npx eslint .`.

## Conventions
- Noms de code, routes, entités et messages en français (`enfants`, `entrees_journal`, `verifierAcces`…).
- Toutes les routes sont protégées par défaut (garde JWT globale) ; utiliser `@Public()`, `@Roles(...)` ou `@SuperAdmin()`.
- Toujours filtrer par `user.garderieId` (issu du JWT) ; pour un enfant, passer par `EnfantsService.verifierAcces()`.
- Les tables sont créées par TypeORM `synchronize` (`DB_SYNCHRONIZE=true`) : ajouter une entité dans `backend/src/entities/` + l'exporter dans `index.ts`.
- Données d'une entrée de journal validées par type dans `backend/src/journal/schemas.ts`.
- Sans `SMTP_HOST`, les courriels (invitations, réinitialisation) sont affichés dans la console du backend, et les routes d'invitation renvoient `lienInvitation` (affiché dans l'interface avec un bouton « Copier »).
- Frontend : messages de succès/erreur via `useNotificationsStore()` (`succes`, `erreur`, `info`, avec action « Annuler » possible) et confirmations via `notif.confirmer({...})` — ne pas utiliser `window.confirm`.
- Super admins : courriels listés dans `SUPER_ADMIN_COURRIELS` (appliqué au démarrage).
- Courriels : `BREVO_API_KEY` (API HTTPS, port 443) prime sur le SMTP — nécessaire en prod car Railway bloque les ports 465/587 sortants. SMTP Brevo (`smtp-relay.brevo.com:587`) suffit en local.
- Photos : binaires stockés en BD (`photos.contenu`/`vignette`, LONGBLOB, `select:false`) — le disque Railway est éphémère. `UPLOAD_DIR` ne sert plus qu'en repli pour les anciennes photos disque locales.

## Déploiement
- Repo : https://github.com/AOrkhis/garderie-2027 (public). Push sur `master` → déploiements auto.
- Backend : Railway, racine `backend/`, `node dist/main`, https://garderie-2027-production.up.railway.app. Variables dans Railway (pas de `.env` committé) : `DB_*`, `CORS_ORIGIN`, `FRONTEND_URL`, `JWT_*`, `BREVO_API_KEY`, `SMTP_*`, `MAIL_FROM`, `SUPER_ADMIN_COURRIELS`, `UPLOAD_DIR` (+ volume `/app/uploads`).
- Frontend : Vercel, racine `frontend/`, https://garderie-2027.vercel.app. Variable `VITE_API_URL=<domaine railway>` (type Config, recalculée au build → redeployer après changement).
- BD : MySQL distant (hôte dans `backend/.env` — ne pas documenter l'adresse ici, repo public), utilisateur dédié `garderie` (droits limités à `Garderie.*`).
- Git : `user.email` du repo = noreply AOrkhis — NE PAS ajouter de `Co-Authored-By` (les déploiements Vercel Hobby bloquent les auteurs non membres).
