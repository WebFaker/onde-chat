# Onde

Une petite messagerie privée entre amis. Comptes, demandes par pseudo, conversations, images et réactions, avec une interface adaptée au mobile. Pas de serveur à créer pour commencer.

## Fonctions

- Recherche par pseudo complet, demandes d'ami à accepter, retrait et blocage.
- Discussions privées, historique, modification et suppression de ses messages, réactions 👍 ❤️ 😂.
- Images de 1 Mo maximum avec aperçu contrôlé côté serveur ; quota de fichiers de 20 Mo par compte.
- Actualisation automatique toutes les deux secondes, indicateurs de non-lus et présence récemment active.
- Brouillons pendant la session, reprise après erreur réseau et clés d'envoi pour éviter les doublons sur une tentative répétée.
- Backoffice protégé côté serveur pour l'administration du site.

Les anciens serveurs, rôles, profils avancés, appels et sonneries sont conservés en base et dans leurs modules ; ils ne sont plus affichés ou chargés par l'interface principale. Aucune donnée existante n'est supprimée par cette simplification. Voir [le périmètre et les limites](docs/SIMPLE-FRIENDS.md) et [le backoffice](docs/BACKOFFICE.md).

## Installer

Node.js 24 et PostgreSQL 17. Copier .env.example dans .env puis renseigner DATABASE_URL, BETTER_AUTH_URL et BETTER_AUTH_SECRET (au moins 32 caractères). Ne jamais committer .env ou des clés.

    npm ci
    npm run db:migrate
    npm run build
    npm start

Les migrations utilisent une connexion PostgreSQL directe ; les requêtes de l'application peuvent utiliser une connexion poolée. La migration 009 ajoute les relations d'amitié, le blocage et les clés d'envoi des messages. Elle préserve les conversations existantes et les reprend comme relations acceptées. Appliquer cette migration avant de publier l'interface.

Le seed de production ne crée aucune communauté de démonstration. Les fixtures et comptes à mot de passe connu des tests sont exclusivement utilisés dans des bases isolées.

## Hébergement et portabilité

Le déploiement Vercel est relié au dépôt GitHub. vercel.json sert public/ et dirige /api/* vers le gestionnaire Node.js. Les mêmes routes et ressources fonctionnent avec npm start ou le Dockerfile. PostgreSQL stocke les comptes Better Auth, profils, relations et messages ; aucune API de données propre à l'hébergeur n'est requise.

Pour migrer : sauvegarder et restaurer la base complète, y compris l'authentification, les fichiers, séquences et l'historique des migrations ; vérifier les comptes et permissions avant de changer DATABASE_URL. Conserver le secret d'authentification et l'origine si les sessions doivent survivre au changement d'hôte. Les médias restent en PostgreSQL pour ce prototype ; un stockage objet sera préférable si leur volume augmente.

## Vérifier

    npm test
    npm run test:browser

Les tests backend utilisent de vraies migrations PostgreSQL dans PGlite et Better Auth. Les parcours navigateur ciblent la messagerie simplifiée et le backoffice, y compris deux sessions, image autorisée, réaction, reconnexion, mobile, panne réseau, réponse perdue et blocage. Chromium peut être installé avec Playwright ou fourni via PLAYWRIGHT_CHROMIUM_PATH.

## Limites actuelles

Actualisation HTTP, pas de WebSocket ni de notifications push. Les brouillons sont conservés en mémoire jusqu'au rechargement ou à la déconnexion. Pas encore de vérification d'adresse e-mail ni de récupération du mot de passe. Les offres gratuites de l'hébergeur et de la base restent soumises à leurs quotas. Les anciens documents de parité Discord décrivent un périmètre historique, pas l'interface actuellement publiée.
