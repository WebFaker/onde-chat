# Onde
Chat en français, frontend JavaScript sans framework, backend Supabase (PostgreSQL + Auth + API protégée par RLS). Compatible avec l'offre gratuite Vercel pour un test personnel, selon ses conditions et quotas actuels. Aucun service payant n'est configuré.

## 1. Configurer Supabase
Créer un projet gratuit. Dans le SQL Editor, exécuter dans l'ordre :
1. `db/migrations/001_core.sql`
2. `db/migrations/002_supabase.sql`
3. `db/seed.sql`

Les migrations s'appliquent une seule fois, dans cet ordre ; conserver leur historique et ajouter un fichier pour toute évolution. Dans Authentication → URL Configuration, renseigner l'URL du site comme Site URL pour les confirmations d'e-mail. Conserver la confirmation d'e-mail activée. L'inscription demande e-mail, pseudo unique et mot de passe. La connexion utilise e-mail et mot de passe.

## 2. Déployer sur Vercel
Créer un compte gratuit GitHub et y importer ce dossier, sans `data/`, `.env` ou secrets. Dans Vercel, importer le dépôt, choisir le preset **Other**, sans commande de build, et le répertoire de sortie `public` (aussi déclaré dans `vercel.json`). Ajouter ces variables pour Production et Preview :
- `SUPABASE_URL` : URL du projet.
- `SUPABASE_PUBLISHABLE_KEY` : clé publique publishable (ou ancienne clé anon).

**Ne jamais utiliser une clé secret ou service_role** : la configuration est envoyée au navigateur. Les autorisations sont appliquées par PostgreSQL, pas par la confidentialité de la clé publique. Déployer, puis configurer l'URL obtenue dans Supabase. L'endpoint `/api/config` est la seule fonction Vercel ; les opérations du chat passent par l'API Supabase avec le jeton de l'utilisateur.

## Local et autre hébergeur
Node 24+, aucune installation nécessaire : copier `.env.example` en `.env`, remplir les deux variables et lancer `npm start`. Ouvrir http://localhost:3000. Le même frontend peut être servi par tout hébergeur statique fournissant `/api/config`. Le Dockerfile permet un serveur Node portable (passer les variables à l'exécution).

## Portabilité
`public/backend.js` est l'adaptateur fournisseur ; l'interface utilise uniquement `request()` et `subscribe()`. Le schéma de base et les identifiants applicatifs sont indépendants de Supabase. `002_supabase.sql` contient les fonctions, le déclencheur et les règles dépendant de son authentification.

Pour migrer : exporter PostgreSQL (`profiles`, `identity_links`, `channels`, `messages`, séquences), restaurer et vérifier les compteurs et relations sur la destination ; remplacer l'adaptateur et les politiques d'accès. Conserver les UUID des profils. Migrer les identités dans `identity_links` séparément. Une exportation des tables du chat ne transfère pas les mots de passe : prévoir une migration Auth compatible ou une réinitialisation des mots de passe. Tester une restauration avant de supprimer l'ancien projet.

L'ancienne base SQLite locale est conservée dans `data/` et ignorée par Git. Elle n'est pas importée automatiquement ; ne pas transférer ses hachages scrypt directement vers Supabase Auth. Pour ce test, la base PostgreSQL démarre vide.

## Limites du test
Une communauté partagée entre tous les comptes inscrits, sans invitation, rôle, modération, messages privés ni audio/vidéo. Derniers 150 messages affichés ; les plus anciens restent en base. Actualisation toutes les cinq secondes dans les onglets visibles, pas de WebSocket pour l'instant. Jusqu'à 200 profils affichés. Les jetons sont stockés dans le navigateur : utiliser un appareil de confiance et éviter tout script tiers non maîtrisé. Les offres gratuites ont des quotas et peuvent mettre les projets inactifs en pause ; vérifier les conditions actuelles chez les fournisseurs.

## Vérification
`npm test` vérifie le contrat de l'adaptateur avec un serveur simulé. Sans projet Supabase connecté, les migrations SQL et les règles RLS ne sont pas validées sur PostgreSQL ici. Avant de partager l'URL, vérifier avec deux comptes : confirmation d'e-mail, connexion, messages croisés, création d'un salon, reconnexion ; vérifier aussi qu'une requête anonyme et un message usurpant un autre `user_id` sont refusés.
