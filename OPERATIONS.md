# Exploitation d’Onde

## Livraison et retour arrière
Node 24 : `npm ci`, `npm test`, `npm run test:browser`, `npm run build`.
Tester chaque migration sur une branche Neon isolée avant la production. Utiliser une connexion directe pour `npm run db:migrate`, une connexion mutualisée pour l’application. Ne jamais modifier une migration appliquée ni publier de fichier d’environnement.
Déployer le commit vérifié par Git/Vercel. Vérifier `/`, `/friends.js`, `/api/auth/ok`, et le refus anonyme de `/api/me`. La migration 010 est additive : le déploiement précédent reste compatible pour un retour arrière sans suppression de données.

## Garanties vérifiées
Les tests utilisent une base isolée et deux sessions : inscription, consentement ami, messages, image, réactions, blocage, perte réseau, réponse perdue après écriture, absence de doublon, changement de compte, repères, recherche, brouillons rechargés, mot de passe et administration. Aucun compte ou serveur de test ajouté en production.
Les écritures DM partagent le verrou transactionnel des relations pour respecter les blocages concurrents. Les fichiers sont contrôlés côté serveur ; les images sont décodées avant stockage. Quotas : 1 Mo/image, 16 mégapixels, 20 Mo/compte. Les quotas concurrents sont sérialisés.
Les limites d’écriture sont persistées par compte et minute : relations 30, fichiers 12, autres écritures 90. Better Auth assure la limitation de l’authentification.

## Confidentialité
Cookies HttpOnly, contrôle serveur des conversations et fichiers. Pas de chiffrement de bout en bout : un opérateur de base peut techniquement accéder aux messages. Le backoffice n’expose pas les DM.
Brouillons texte et clés de reprise dans sessionStorage, séparés par compte, effacés à la déconnexion. Conservation après rechargement de l’onglet, pas après sa fermeture définitive. Les images en attente restent en mémoire. Aucun envoi différé automatique après une panne.

## Limites opérationnelles
Aucun service d’e-mail transactionnel configuré : vérification de l’adresse et récupération du mot de passe par e-mail indisponibles. Changement de mot de passe connecté et fermeture des autres sessions disponibles. Ne jamais présenter une adresse comme vérifiée.
La synchronisation utilise un polling suspendu en arrière-plan avec recul exponentiel en cas de panne ; aucune promesse de millions de connexions simultanées. Les quotas et interruptions des offres gratuites Vercel et Neon s’appliquent.
La rétention des sauvegardes dépend du plan Neon. Avant une ouverture publique large : définir la rétention, exporter régulièrement via pg_dump (connexion directe) dans un stockage chiffré distinct, tester une restauration isolée. Ne jamais stocker un export dans Git.
Les anciens appels/espaces restent conservés hors interface. Les tests actuels ne prouvent pas le transport audio/vidéo réel. Aucune promesse d’équivalence Discord/Nitro.
Les journaux Vercel nécessitent une connexion autorisée au projet. Contrôler les erreurs et la latence après chaque livraison ; ne jamais contourner une protection d’accès.
