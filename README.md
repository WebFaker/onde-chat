# Onde
Chat communautaire en français : frontend JavaScript, API Node.js, PostgreSQL et Better Auth. Aucune dépendance à Supabase à l'exécution. Les comptes, hachages de mots de passe et sessions restent dans votre base. Cette version vise un test personnel avec Vercel Hobby et une base PostgreSQL gratuite (par exemple Neon), selon les conditions et quotas des fournisseurs.

## Démarrage local
Node.js 24+, une base PostgreSQL dédiée et une URL de connexion privée.

```sh
npm ci
cp .env.example .env
```

Renseigner `.env` :
- `DATABASE_URL` : URL PostgreSQL ; pour Neon, utiliser la connexion poolée fournie, avec TLS.
- `BETTER_AUTH_SECRET` : secret aléatoire d'au moins 32 caractères, uniquement côté serveur.
- `BETTER_AUTH_URL` : origine exacte, par exemple `http://localhost:3000`.
- `PORT` : facultatif, 3000 par défaut.

Puis :

```sh
npm run db:migrate
npm start
```

Lancer les migrations comme étape de livraison, jamais à chaque requête. Le script journalise les versions et leurs sommes de contrôle, utilise un verrou PostgreSQL et une transaction par migration. Les migrations appliquées sont immuables : ajouter un nouveau fichier pour toute évolution. L'amorçage des quatre salons est rejouable.

## Déploiement Vercel
Le projet peut être livré directement par l'API Vercel ou relié à GitHub. Preset **Other**, sortie `public`, aucune commande de build. L'installation doit exécuter `npm ci` (ne pas configurer une commande d'installation vide). Le fichier `api/handler.js` monte exactement la même API que le serveur Node local. Utiliser Node 24.

Configurer les trois variables côté serveur, puis exécuter `npm run db:migrate` sur la base cible avant le déploiement. Ne pas exposer `DATABASE_URL` ou `BETTER_AUTH_SECRET` dans le frontend. `BETTER_AUTH_URL` doit correspondre à l'URL stable de production en HTTPS. Ne pas connecter les previews à la base de production : utiliser une base dédiée et l'origine exacte de chaque environnement.

Vérifier après publication : inscription et connexion avec deux navigateurs, échange de messages, création de salon, déconnexion et refus des requêtes anonymes. Le projet Vercel existant s'appelle `onde-chat` ; conserver son identité lors de la reprise du déploiement.

## Autre hébergeur / Docker
Le Dockerfile installe uniquement les dépendances de production avec `npm ci`. Injecter les trois variables à l'exécution. Lancer la migration une seule fois avant la nouvelle version, puis le serveur derrière HTTPS. Les sessions et données ne dépendent pas de la mémoire du processus. La diffusion utilise une lecture périodique toutes les cinq secondes ; un serveur WebSocket pourra remplacer ce module si l'usage le justifie.

## Architecture et migration future
- `lib/application.js` : API et contrôles d'accès. Chaque opération du chat exige une session validée côté serveur ; l'auteur d'un message est calculé par le serveur.
- `lib/auth.js` : intégration Better Auth, cookies HttpOnly et limitation des tentatives en base.
- `lib/database.js` : pool PostgreSQL avec cinq connexions maximum par instance.
- `public/backend.js` : contrat navigateur `request()` / `subscribe()`, sans jeton d'identité dans le stockage JavaScript.
- `db/migrations/001_core.sql` : données applicatives et UUID de profils indépendants du fournisseur d'identité.
- `002_better_auth.sql` : schéma généré avec Better Auth 1.7.12, y compris les compteurs de limitation en base.
- `003_identity.sql` : création atomique d'un profil et de son lien avec le compte lors de l'inscription.

Pour changer d'hébergeur PostgreSQL : sauvegarder la base complète (y compris les tables Better Auth et l'historique des migrations), la restaurer et vérifier les séquences, relations et comptes sur la destination, puis changer `DATABASE_URL`. Conserver le secret et l'origine si les sessions doivent survivre. Tester une restauration avant de supprimer l'ancienne base. Automatiser les sauvegardes avec les outils du fournisseur ou `pg_dump` et les conserver séparément.

Pour remplacer Better Auth, adapter `lib/auth.js`, le déclencheur et les liens d'identités sans modifier les UUID des profils ni les auteurs des messages. La migration des mots de passe exige un format compatible ; sinon, prévoir une réinitialisation.

`db/legacy/002_supabase.sql` est conservé pour référence et n'est jamais exécuté par le nouveau runner. L'ancienne base SQLite `data/` reste ignorée par Git et n'est pas importée. Cette nouvelle chaîne de migrations vise une base vide : ne pas l'appliquer directement à un ancien schéma Supabase.

## Tests et limites
`npm test` exécute les vraies migrations PostgreSQL dans PGlite, le moteur PostgreSQL embarqué, et Better Auth : inscription, cookie HttpOnly, connexion, identité stable, messages entre deux comptes, prévention de l'usurpation de l'auteur, refus des origines étrangères et déconnexion. Le client PostgreSQL des tests remplace seulement le transport ; aucune base distante n'est nécessaire. Les tests ne vérifient pas TLS, le réseau Neon, le routage Vercel ou le rendu dans un navigateur.

Une seule communauté : tous les inscrits voient tous les salons. Pas encore d'invitations, modération, fichiers, messages privés ou audio/vidéo. Derniers 150 messages affichés et jusqu'à 200 profils. Les adresses e-mail ne sont pas vérifiées et la récupération des mots de passe n'est pas configurée : réserver cette version à un test fermé et ajouter un fournisseur d'e-mail avant une ouverture plus large. Les offres gratuites ne garantissent pas une disponibilité permanente et peuvent mettre une base inactive en veille.

## Validation du parcours de connexion

La validation HTTP en production a passé 27 contrôles : deux inscriptions, cookies Secure/HttpOnly, erreurs de connexion, deux sessions indépendantes, salons, messages croisés, auteur non falsifiable, origine étrangère refusée, déconnexion et reconnexion avec identité stable. Les comptes QA_92604931A / QA_92604931B et le salon qa-92604931 ont été créés pour cette validation ; aucun mot de passe ou cookie n'est conservé dans le dépôt.

`npm test` inclut aussi des tests DOM avec JSDOM : mot de passe incorrect, panne pendant le chargement après connexion, succès, expiration de session, déconnexion et affichage inerte du HTML des messages. Ce test DOM ne remplace pas une inspection visuelle dans un vrai navigateur.

`scripts/smoke-production.py` peut être exécuté explicitement pour revalider le site (`ONDE_TEST_URL` configurable) ; chaque exécution crée deux nouveaux comptes QA et un salon QA, sans suppression automatique. Ne pas le lancer en boucle. Utiliser https://onde-chat.vercel.app : les anciennes URL de déploiement sont immuables et peuvent conserver d'anciennes erreurs.
