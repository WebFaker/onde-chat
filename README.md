# Onde
Une application communautaire française, avec interface sombre responsive inspirée des dispositions classiques de Discord, API Node.js portable, PostgreSQL et authentification Better Auth. Frontend et backend ne dépendent pas des API de données d'un hébergeur.

## Fonctions disponibles
- Espaces communautaires privés, invitations de sept jours, rôles propriétaire/administration/modération/membre, exclusion et journal de modération.
- Un espace d'accueil commun à tous les inscrits. Les espaces créés ensuite sont privés. Dans l'accueil, les membres peuvent créer des salons ; ailleurs cette permission est réservée à la modération.
- Salons textuels et vocaux, messages privés entre membres partageant un espace.
- Réponses, six réactions, modification de ses messages, suppression par l'auteur ou la modération, épinglage par la modération, recherche dans le salon et indicateurs de messages non lus.
- Pièces jointes téléchargées avec autorisation : PNG, JPEG, WebP, GIF, PDF et texte. Limite 1 Mo par fichier et 20 Mo par utilisateur. Stockage PostgreSQL pour ce prototype ; prévoir un stockage objet pour davantage de volume.
- Profil avec présentation, couleur, statut personnalisé et disponibilités (dont invisible). Avatars et bannières statiques ou animés : 512 Ko, 60 images maximum ; images décodées et converties en WebP, version fixe pour la réduction des animations. Conservation dans PostgreSQL, deux images maximum par compte. Les anciennes données de progression sont conservées mais ne sont plus affichées dans l’interface.
- Appels LiveKit : jetons autorisés par salon, micro, caméra, partage d'écran et déconnexion. **Un service LiveKit doit être connecté pour que les appels fonctionnent.** Les tests ne constituent pas une validation réelle de deux appels audio/vidéo sur Internet.

## Installer et lancer
Node.js 24 et PostgreSQL. Aucun compte Supabase requis.

```sh
npm ci
cp .env.example .env
# Renseigner .env, puis :
npm run db:migrate
npm run build
npm start
```

Variables obligatoires, uniquement côté serveur :
- `DATABASE_URL` : connexion PostgreSQL, poolée pour le trafic de l'application et protégée par TLS en production.
- `BETTER_AUTH_URL` : origine exacte du site, `http://localhost:3000` localement, `https://onde-chat.vercel.app` en production.
- `BETTER_AUTH_SECRET` : secret aléatoire de 32 caractères minimum.
- `PORT` : facultatif, 3000 par défaut.

Pour les migrations, utiliser une connexion PostgreSQL directe : le runner utilise un verrou consultatif de session. Il journalise les fichiers et leurs sommes de contrôle et applique une transaction par fichier. Ne jamais modifier une migration appliquée. Les migrations sont une étape de livraison, jamais une opération exécutée pendant une requête web. La migration `004_communities.sql` conserve les messages et ajoute les comptes existants à l'espace d'accueil.

## Activer les appels
Configurer un serveur LiveKit Cloud ou auto-hébergé, puis ajouter dans l'environnement serveur :

```text
LIVEKIT_URL=wss://votre-serveur-livekit
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

La clé secrète ne doit jamais être placée dans les fichiers publics. L'API génère des jetons courts, limités à un salon vocal dont l'utilisateur est membre. Les contrôles d'accès sont vérifiés à chaque nouvelle demande de jeton. Le transport est WebRTC via LiveKit ; il peut être déplacé sur un serveur auto-hébergé. Les coûts/quota du service vocal sont distincts de l'hébergement web. Avant de l'ouvrir à une communauté, tester deux appareils, les permissions micro/caméra, la reconnexion et les réseaux nécessitant TURN. La révocation d'un membre empêche les nouvelles demandes de jeton ; la déconnexion immédiate des médias déjà connectés n'est pas encore implémentée.

## Déployer
Sur Vercel : Node 24, preset Other, commande d'installation `npm ci`, commande de build `npm run build`, sortie `public`. `vercel.json` contient ces réglages et la réécriture de toutes les routes `/api/*` vers `api/handler.js`. Garder le projet existant `onde-chat`.

Appliquer les migrations sur la base cible avant le déploiement, renseigner les variables pour Production puis livrer le commit. Ne pas relier les previews à la base de production. Ouvrir l'URL stable https://onde-chat.vercel.app ; les URL historiques restent figées sur leur ancien code.

Le Dockerfile construit les ressources du navigateur, puis installe les dépendances de production dans une seconde image. Injecter les mêmes variables et placer le serveur derrière HTTPS.

## Architecture et portabilité
- `lib/application.js` : session, origine des mutations, limites des requêtes et erreurs JSON.
- `lib/features/community.js` : appartenance aux espaces, rôles et opérations du chat. Les UUID des profils restent indépendants de Better Auth.
- `lib/auth.js` : Better Auth, mots de passe hachés, cookies HttpOnly et limite de tentatives stockée dans PostgreSQL.
- `public/app.js`, `public/backend.js` : interface et adaptateur HTTP de même origine, sans jeton de session dans le stockage JavaScript.
- `client/calls.js` : client LiveKit chargé uniquement lors d’un appel. `client/motion.js` est conservé mais n’est plus construit ni chargé par l’interface actuelle.
- Les ressources vectorielles de l’ancien design sont conservées mais ne sont plus chargées. Les préférences de réduction des mouvements restent respectées.
- `db/migrations` : schéma versionné. `db/legacy` est documentaire et n'est pas appliqué.

Pour changer de fournisseur PostgreSQL : exporter et restaurer la base complète avec tables d'authentification, séquences et historique de migrations ; vérifier les comptes, permissions et fichiers avant de changer `DATABASE_URL`. Conserver le secret et l'origine si les sessions doivent survivre. Automatiser des sauvegardes indépendantes du fournisseur et tester leur restauration. Pour changer d'authentification, conserver les UUID des profils et adapter `identity_links` ; une réinitialisation des mots de passe peut être nécessaire.

## Vérification
```sh
npm test
npm run test:browser
```

Les tests Node utilisent de vraies migrations PostgreSQL dans PGlite et Better Auth : inscription, sessions, accès anonymes, espaces privés, invitations, rôles et exclusions, messages privés, réponses, réactions, modifications, épinglage, recherche, fichiers et autorisations, profils, présence, progression et génération de jetons vocaux. Les tests des appels vérifient les autorisations et les claims des jetons ; aucun serveur média LiveKit n'est lancé.

Les sept parcours Chromium vérifient les échanges entre deux sessions, les erreurs de réseau, la conservation des brouillons et la prévention des doubles envois, le mobile, la navigation, les modales, invitations, messages enrichis, téléchargement, recherche, messages privés, profils et absence des anciennes décorations. Le serveur de test et sa base sont isolés de la production. Installer Chromium avec `npx playwright install chromium`, ou fournir `PLAYWRIGHT_CHROMIUM_PATH`. Les captures sont dans `test-results/` (ignoré par Git).

GitHub Actions exécute ces tests à chaque modification. `scripts/smoke-production.py` est un ancien test explicitement manuel : il crée deux comptes et un salon QA et ne doit pas être lancé automatiquement ou en boucle.

## Limites actuelles
Actualisation des messages et de la présence toutes les cinq secondes dans les onglets visibles. Les notifications sont une boîte de messages non lus dans l'app, sans push système. La vue affiche au plus 150 messages récents, la recherche interroge l'historique du salon ; l'API accepte `before` mais la navigation vers les pages anciennes n'est pas encore exposée dans l'interface. Les listes de membres sont limitées à 200.

Pas encore de vérification d'e-mail ou récupération des mots de passe, de bannissement durable, de blocage personnel, de threads dédiés, de gestion avancée des permissions par salon, de protection anti-spam du chat ni de mécanisme de recours de modération. Les rôles existants sont prédéfinis. Les offres gratuites ont des quotas et ne constituent pas une garantie de disponibilité. Cette version doit rester un test fermé avant une ouverture plus large.

## Présentation actuelle
À la demande du propriétaire, l’interface revient à une présentation proche de Discord : rail de serveurs, liste de salons, messages et membres, surfaces gris foncé et accent bleu-violet. Les éléments de progression, les missions et les Lottie ne sont plus affichés dans le chat ; les données de progression restent conservées. Aucun changement de base n’est nécessaire pour cette présentation.

## Personnalisation et objectif Discord

Les thèmes classique, minuit et clair, la densité, la taille du texte et la réduction des mouvements sont gratuits et conservés sur cet appareil (Profil → Apparence). Les messages acceptent une mise en forme légère et des spoilers, construits avec des nœuds DOM sans injection HTML.

Voir [l’état des fonctions et les limites](docs/DISCORD-PARITY.md). Onde ne possède pas toutes les fonctions de Discord et ne vend actuellement aucun abonnement.

La migration `005_profiles.sql` ajoute les champs de profil et une table de médias bornée. Elle est additive et compatible avec l’ancienne interface ; appliquer la migration avant de publier cette interface. `sharp` décode et redimensionne les images côté serveur, sans accepter de SVG ou d’URL externe. Les téléchargements exigent un compte et une communauté ou conversation partagée.

## Backoffice

`/admin.html` fournit une administration protégée côté serveur : utilisateurs, suspension et sessions, retrait de personnalisation, serveurs/salons et archivage réversible, rôles des membres, modération des messages de serveur et journal des actions. Un motif est requis pour chaque modification. L'accès est attribué manuellement à un compte existant par ses identifiants internes ; il ne dépend pas d'une simple adresse saisie à l'inscription. Voir [le fonctionnement et les limites](docs/BACKOFFICE.md).
