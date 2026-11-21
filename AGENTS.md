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
