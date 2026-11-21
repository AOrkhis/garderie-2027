# Garderie 2027 — Cahier des charges

> Plateforme SaaS de gestion de garderies et de communication avec les parents.
> **Toute l'interface, les courriels et les messages sont en français.**

---

## 1. Vision du produit

Garderie 2027 permet à n'importe quelle garderie de :

1. **Créer son compte** sur la plateforme (inscription en libre-service).
2. **Inscrire les enfants** et inviter leurs parents.
3. **Publier le journal quotidien** de chaque enfant : activités, repas, sieste, remarques et photos.

Les **parents** se connectent pour consulter la journée de leur enfant en temps réel, depuis un ordinateur ou un téléphone.

Chaque garderie est isolée des autres : une garderie ne voit jamais les données d'une autre (architecture **multi-locataire**).

---

## 2. Rôles et permissions

| Rôle | Qui | Portée |
|---|---|---|
| **Super administrateur** | L'équipe Garderie 2027 (vous) | Toute la plateforme |
| **Administrateur de garderie** | Propriétaire / directrice de la garderie | Sa garderie uniquement |
| **Gestionnaire** | Éducatrices et personnel de la garderie | Sa garderie (ou ses groupes assignés) |
| **Parent** | Parents / tuteurs | Ses propres enfants uniquement |

### 2.1 Matrice des permissions

| Action | Super admin | Admin garderie | Gestionnaire | Parent |
|---|:-:|:-:|:-:|:-:|
| Gérer toutes les garderies (activer, suspendre) | ✅ | ❌ | ❌ | ❌ |
| Modifier les infos de la garderie | ✅ | ✅ | ❌ | ❌ |
| Inviter / retirer des gestionnaires | ❌ | ✅ | ❌ | ❌ |
| Créer / modifier les groupes | ❌ | ✅ | ❌ | ❌ |
| Inscrire / modifier / archiver un enfant | ❌ | ✅ | ✅ | ❌ |
| Inviter un parent et le lier à un enfant | ❌ | ✅ | ✅ | ❌ |
| Publier le journal quotidien (activités, repas, sieste, remarques) | ❌ | ✅ | ✅ | ❌ |
| Téléverser des photos | ❌ | ✅ | ✅ | ❌ |
| Consulter le journal de **ses** enfants | ❌ | — | — | ✅ |
| Consulter / télécharger les photos de **ses** enfants | ❌ | — | — | ✅ |
| Modifier son propre profil | ✅ | ✅ | ✅ | ✅ |

> Un même utilisateur peut avoir plusieurs rôles (ex. une éducatrice qui est aussi parent d'un enfant de la garderie).

---

## 3. Parcours utilisateurs

### 3.1 Création d'une garderie (inscription SaaS)
1. Visiteur → page d'accueil publique → « Créer ma garderie ».
2. Formulaire : nom de la garderie, adresse, téléphone, courriel, nom de l'administrateur, mot de passe.
3. Courriel de confirmation → activation du compte.
4. L'administrateur arrive sur un **assistant de démarrage** : créer les groupes → inviter les gestionnaires → inscrire les enfants.

### 3.2 Invitation d'un gestionnaire
1. L'admin saisit le courriel du gestionnaire et lui assigne (facultatif) un ou plusieurs groupes.
2. Le gestionnaire reçoit un courriel avec un lien d'invitation (valide 7 jours).
3. Il crée son mot de passe et accède au tableau de bord.

### 3.3 Inscription d'un enfant et invitation des parents
1. Le gestionnaire crée la fiche de l'enfant (voir §4.3).
2. Il ajoute un ou plusieurs parents (courriel, nom, lien : mère, père, tuteur…).
3. Chaque parent reçoit une invitation par courriel. Si le parent a déjà un compte (ex. un autre enfant), l'enfant est simplement ajouté à son compte.

### 3.4 Journée type d'un gestionnaire
1. Ouvre la vue **« Aujourd'hui »** de son groupe : liste des enfants avec leur statut.
2. Note l'**arrivée** des enfants.
3. Au fil de la journée, ajoute des entrées : repas, sieste, activité, remarque, photos.
4. Possibilité de faire une entrée **pour plusieurs enfants à la fois** (ex. « Activité peinture » pour tout le groupe, avec la même photo).
5. Note le **départ** des enfants.

### 3.5 Consultation par un parent
1. Le parent se connecte → voit la liste de ses enfants.
2. Sélectionne un enfant → **chronologie de la journée** (fil d'événements avec heures).
3. Peut naviguer vers les jours précédents (calendrier).
4. Consulte la **galerie photos** de l'enfant.
5. Reçoit une notification (courriel, puis push en phase 2) lorsqu'une nouvelle entrée est publiée.

---

## 4. Fonctionnalités détaillées

### 4.1 Authentification
- Connexion par courriel + mot de passe.
- Mot de passe oublié (lien par courriel).
- Jetons JWT (accès court + jeton de rafraîchissement).
- Mots de passe hachés (argon2 ou bcrypt).
- Phase 2 : authentification à deux facteurs pour les admins.

### 4.2 Gestion de la garderie
- Profil : nom, logo, adresse, téléphone, courriel, heures d'ouverture.
- **Groupes** (ex. « Poupons », « Les Explorateurs ») avec tranche d'âge et gestionnaires assignés.
- Liste du personnel, invitations en attente, désactivation d'un compte.

### 4.3 Fiche enfant
- Prénom, nom, date de naissance, photo de profil.
- Groupe.
- **Allergies** et restrictions alimentaires (affichées en évidence partout).
- Informations médicales / notes importantes.
- Contacts d'urgence et personnes autorisées à venir chercher l'enfant.
- Parents liés.
- Date d'entrée, statut (actif / archivé).

### 4.4 Journal quotidien
Chaque entrée est horodatée et liée à un enfant, une date et l'auteur.

| Type d'entrée | Champs |
|---|---|
| **Arrivée / Départ** | Heure, personne qui dépose / vient chercher |
| **Repas** | Moment (déjeuner, collation AM, dîner, collation PM), menu, quantité mangée (*Tout / Bien / Un peu / Rien*), commentaire |
| **Sieste** | Heure de début, heure de fin (durée calculée), qualité (*Bien dormi / Agité / N'a pas dormi*) |
| **Activité** | Titre, description, catégorie (*motricité, art, musique, plein air, langage…*), photos |
| **Hygiène** *(facultatif)* | Couche / toilette, heure, remarque |
| **Humeur** | *Joyeux / Calme / Fatigué / Triste / Agité* |
| **Remarque** | Texte libre, niveau d'importance (*info / important*) |
| **Photo** | Une ou plusieurs photos, légende |

Règles :
- Une entrée peut être modifiée ou supprimée par son auteur ou un admin, le jour même.
- Les entrées multi-enfants créent une entrée par enfant (pour que chaque parent ne voie que son enfant).
- **Résumé de fin de journée** généré automatiquement (repas, durée de sieste, nombre de photos, remarques).

### 4.5 Photos
- Téléversement depuis le téléphone ou l'ordinateur (JPEG, PNG, HEIC), plusieurs à la fois.
- Compression et génération de vignettes côté serveur.
- Stockage privé (S3 ou équivalent) ; accès **uniquement par URL signée temporaire**.
- Une photo peut être associée à plusieurs enfants ; un parent ne voit que les photos où son enfant est identifié.
- Galerie par enfant, filtrable par date.

### 4.6 Espace parent
- Tableau de bord : enfants, dernière entrée de chaque enfant.
- Chronologie de la journée + navigation par date.
- Galerie photos.
- Fiche de l'enfant en lecture (allergies, contacts) — demandes de modification en phase 2.
- Préférences de notification.

### 4.7 Notifications
- **MVP** : courriels (invitation, mot de passe oublié, résumé de fin de journée).
- **Phase 2** : notifications push (PWA), messagerie parent ↔ garderie.

### 4.8 Administration de la plateforme (super admin)
- Liste des garderies, statistiques d'utilisation.
- Suspendre / réactiver une garderie.
- Gestion des abonnements (phase 2).

---

## 5. Exigences non fonctionnelles

### 5.1 Langue
- Interface **100 % en français** (libellés, erreurs de validation, courriels, dates).
- Formats : dates `20 novembre 2026`, heures `14 h 30`, fuseau horaire de la garderie.
- Les textes sont centralisés dans des fichiers de traduction (`vue-i18n`, locale `fr`) pour faciliter un ajout éventuel de l'anglais.

### 5.2 Sécurité et vie privée
Les données concernent des **enfants mineurs** : la protection est prioritaire.
- Isolation stricte par garderie : chaque requête est filtrée par `garderieId` côté serveur.
- Un parent n'accède qu'aux enfants qui lui sont liés (vérifié côté serveur à chaque requête).
- HTTPS obligatoire, photos jamais publiques.
- Journal d'audit des actions sensibles (accès aux fiches, suppression, changements de rôles).
- Consentement des parents pour la prise de photos (case dans la fiche enfant ; si refus, l'enfant ne peut pas être identifié sur une photo).
- Conformité à la loi applicable sur les renseignements personnels (ex. **Loi 25 au Québec**) : politique de confidentialité, droit d'accès et de suppression, hébergement des données au Canada recommandé.
- Limitation du nombre de tentatives de connexion.

### 5.3 Ergonomie
- **Mobile d'abord** : les gestionnaires utilisent surtout une tablette ou un téléphone.
- Saisie rapide : une entrée en 2-3 touches (boutons prédéfinis plutôt que texte libre).
- Accessibilité WCAG AA.

### 5.4 Performance
- Chronologie d'une journée chargée en moins d'une seconde.
- Pagination des galeries photos.

---

## 6. Architecture technique

```
Garderie 2027/
├── backend/    NestJS 10 · TypeScript — API REST (/api)
└── frontend/   Vue 3 · Vite · TypeScript · Vue Router · Pinia
```

| Couche | Choix proposé |
|---|---|
| API | NestJS, préfixe `/api`, validation `class-validator` |
| Base de données | MySQL 8 |
| ORM | TypeORM — tables créées automatiquement à partir des entités (`synchronize`) |
| Authentification | `@nestjs/passport` + JWT (accès 15 min + rafraîchissement 7 j), gardes par rôle (`@Roles()`) |
| Stockage des photos | Disque local privé (`backend/uploads`), servi par URL signée de 2 h — S3 en phase 2 |
| Traitement d'images | `sharp` (redimensionnement 1920 px + vignette 480 px, rotation EXIF) |
| Courriels | Nodemailer (SMTP) ; sans SMTP configuré, les courriels s'affichent dans la console |
| Frontend | Vue 3, Pinia, Vue Router — textes en français directement dans les composants |
| UI | CSS maison (`frontend/src/assets/main.css`), sans bibliothèque de composants |

### 6.1 Multi-locataire
- Une seule base de données ; toutes les tables métier ont une colonne `garderieId`.
- Le `garderieId` est extrait du jeton JWT (via l'adhésion courante), **jamais** du corps de la requête.
- Chaque service filtre explicitement par `user.garderieId` ; `EnfantsService.verifierAcces()` vérifie en plus le lien parent ↔ enfant pour les parents.
- Un utilisateur peut appartenir à plusieurs garderies (une adhésion par rôle) et changer de garderie active depuis la barre de navigation.

---

## 7. Modèle de données

Implémenté dans `backend/src/entities/` (tables : `garderies`, `utilisateurs`, `adhesions`, `invitations`, `groupes`, `groupes_gestionnaires`, `enfants`, `parents_enfants`, `contacts_urgence`, `entrees_journal`, `entrees_journal_photos`, `photos`, `photos_enfants`, `journal_audit`).

```
Garderie
  id, nom, slug, adresse, telephone, courriel, logoUrl, fuseauHoraire,
  statut (ACTIVE | SUSPENDUE), creeLe

Utilisateur
  id, courriel (unique), motDePasseHash, prenom, nom, telephone,
  estSuperAdmin, actif, creeLe

Adhesion                     -- rôle d'un utilisateur dans une garderie
  id, utilisateurId, garderieId, role (ADMIN | GESTIONNAIRE | PARENT)

Invitation
  id, garderieId, courriel, role, jeton, expireLe, accepteeLe, enfantId?

Groupe
  id, garderieId, nom, trancheAge

GroupeGestionnaire
  groupeId, utilisateurId

Enfant
  id, garderieId, groupeId, prenom, nom, dateNaissance, photoProfilUrl,
  allergies, notesMedicales, consentementPhoto, statut (ACTIF | ARCHIVE), dateEntree

ParentEnfant
  parentId (Utilisateur), enfantId, lien (MERE | PERE | TUTEUR | AUTRE)

ContactUrgence
  id, enfantId, nom, telephone, lien, autoriseARecuperer

EntreeJournal
  id, garderieId, enfantId, auteurId, date, heure,
  type (ARRIVEE | DEPART | REPAS | SIESTE | ACTIVITE | HYGIENE | HUMEUR | REMARQUE | PHOTO),
  donnees (JSON selon le type), creeLe, modifieLe

Photo
  id, garderieId, auteurId, cleStockage, cleVignette, legende, priseLe

PhotoEnfant
  photoId, enfantId

EntreeJournalPhoto
  entreeId, photoId

JournalAudit
  id, garderieId, utilisateurId, action, cible, creeLe
```

---

## 8. API REST (aperçu)

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| POST | `/api/auth/inscription-garderie` | Public | Créer une garderie + son admin |
| POST | `/api/auth/connexion` | Public | Connexion |
| POST | `/api/auth/rafraichir` | Connecté | Nouveau jeton d'accès |
| POST | `/api/auth/mot-de-passe-oublie` | Public | Envoi du lien |
| POST | `/api/invitations/:jeton/accepter` | Public | Accepter une invitation |
| GET / PATCH | `/api/garderie` | Admin | Profil de la garderie |
| GET / POST | `/api/groupes` | Admin, Gestionnaire | Groupes |
| GET / POST | `/api/personnel` | Admin | Gestionnaires et invitations |
| GET / POST | `/api/enfants` | Admin, Gestionnaire | Liste / inscription |
| GET / PATCH | `/api/enfants/:id` | Admin, Gestionnaire, Parent (lecture) | Fiche enfant |
| POST | `/api/enfants/:id/parents` | Admin, Gestionnaire | Lier / inviter un parent |
| GET | `/api/enfants/:id/journal?date=AAAA-MM-JJ` | Tous (selon accès) | Journal d'une journée |
| POST | `/api/journal` | Admin, Gestionnaire | Créer des entrées (un ou plusieurs enfants) |
| PATCH / DELETE | `/api/journal/:id` | Auteur, Admin | Modifier / supprimer |
| POST | `/api/photos` | Admin, Gestionnaire | Téléverser (multipart) |
| GET | `/api/enfants/:id/photos` | Tous (selon accès) | Galerie |
| GET | `/api/parent/enfants` | Parent | Mes enfants |
| GET | `/api/journal/jour?groupeId=&date=` | Admin, Gestionnaire | Vue du jour (présences + résumés) |
| GET | `/api/photos/:id/fichier?jeton=` | Lien signé | Fichier photo (ou `&taille=vignette`) |
| GET / PATCH | `/api/admin/garderies` | Super admin | Liste des garderies, suspendre / réactiver |

---

## 9. Pages du frontend

**Public**
- `/` — Accueil / présentation du service
- `/inscription` — Créer ma garderie
- `/connexion`, `/mot-de-passe-oublie`, `/invitation/:jeton`

**Garderie (admin & gestionnaire)**
- `/garderie/aujourd-hui` — Vue du jour par groupe (saisie rapide)
- `/garderie/enfants` — Liste des enfants
- `/garderie/enfants/nouveau`, `/garderie/enfants/:id` — Fiche enfant + journal
- `/garderie/photos` — Téléversement et galerie
- `/garderie/groupes` *(admin)*
- `/garderie/personnel` *(admin)*
- `/garderie/parametres` *(admin)*

**Parent**
- `/parent` — Mes enfants
- `/parent/enfants/:id` — Chronologie de la journée (+ calendrier), onglets Photos et Fiche

**Tous**
- `/profil` — Profil et mot de passe

**Super admin**
- `/admin/garderies`

---

## 10. Feuille de route

### Phase 1 — MVP
- [x] MySQL + TypeORM (création automatique des tables)
- [x] Authentification (connexion, JWT, rôles, mot de passe oublié, limitation des tentatives)
- [x] Inscription d'une garderie + message de démarrage
- [x] Groupes et invitation des gestionnaires
- [x] Fiches enfants (allergies, contacts d'urgence, consentement photo) + invitation des parents
- [x] Journal quotidien (arrivée/départ, repas, sieste, activité, hygiène, humeur, remarque, photo), entrées multi-enfants
- [x] Téléversement et galerie de photos (URL signées, consentement vérifié)
- [x] Espace parent : chronologie + résumé + galerie (actualisation automatique)
- [x] Tableau de bord super admin (statistiques, suspension)
- [x] Interface en français, responsive mobile
- [ ] Confirmation du courriel à l'inscription
- [ ] Photo de profil de l'enfant et logo de la garderie
- [ ] Migrations TypeORM (désactiver `synchronize` en production)

### Phase 2
- [ ] Notifications push (PWA) et résumé quotidien par courriel
- [ ] Messagerie parent ↔ garderie
- [ ] Stockage des photos sur S3 / R2
- [ ] Abonnements et facturation des garderies (Stripe)

### Phase 3
- [ ] Gestion des présences et rapports mensuels
- [ ] Menus de la semaine, calendrier d'événements
- [ ] Application mobile (Capacitor) ou PWA installable
- [ ] Authentification à deux facteurs

---

## 11. Questions ouvertes

1. **Marché cible** : Québec uniquement (Loi 25, hébergement au Canada) ou toute la francophonie ?
2. **Modèle d'affaires** : abonnement mensuel par garderie ? par enfant ? essai gratuit ?
3. **Sous-domaine par garderie** (`mapetitegarderie.garderie2027.ca`) ou URL unique ?
4. Les gestionnaires voient-ils **tous** les enfants de la garderie ou seulement ceux de leurs groupes ? *(MVP : tous, avec filtre par groupe)*
5. Les parents peuvent-ils **répondre / commenter** une entrée dès le MVP ?
6. Durée de conservation des photos et des journaux après le départ d'un enfant ?
