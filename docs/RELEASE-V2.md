# Onde V2 — résultat prêt pour revue

Cette version n'est pas encore publiée en production. Le contrôle d'approbation automatique a refusé la mutation de la base primaire sans accord explicite pour cette migration précise.

## Autorisation nécessaire
Appliquer `db/migrations/004_communities.sql` à la base `onde` du projet Neon `wispy-water-70693306`, branche primaire `br-wispy-butterfly-b9iq8nm8`, puis publier ce code sur le projet Vercel existant `onde-chat`.

La migration :
- Ajoute les espaces, adhésions et quatre rôles prédéfinis.
- Classe les salons actuels dans l'espace d'accueil et ajoute leurs types et descriptions.
- Remplace l'unicité globale du nom des salons par un index unique `(server_id, name)`, afin que deux espaces puissent chacun avoir un salon `général`.
- Ajoute invitations hachées, conversations privées, réponses, réactions, lectures, profils, présence, journal de modération et fichiers.
- Ajoute les comptes existants à l'espace d'accueil et un déclencheur pour les inscriptions suivantes.
- Ne supprime aucun compte, message ou salon existant.

Les mutations et changements de contraintes sont permanents. Ils doivent être appliqués avant que le nouveau backend reçoive du trafic. Le code actuel peut continuer à fonctionner avec les colonnes ajoutées pendant la transition.

## Vérification réalisée
- Migration appliquée et vérifiée sur une branche Neon isolée, avec comptes et messages existants conservés.
- Tests Node/PostgreSQL : sessions, accès anonymes, espaces privés, invitations, rôles/exclusions, MP, réactions, réponses, édition, épinglage, recherche, fichiers/autorisations, profils, présence, progression et droits des jetons LiveKit.
- Sept parcours Chromium réussis, sur ordinateur et mobile, avec deux sessions indépendantes et une base de test isolée.
- Animations Lottie servies localement ; réduction des mouvements testée.
- Captures ordinateur et mobile vérifiées.

## Point externe non résolu
Les appels réels nécessitent `LIVEKIT_URL`, `LIVEKIT_API_KEY` et `LIVEKIT_API_SECRET`. La génération de jetons et les droits sont testés ; le transport audio/vidéo et le partage d'écran avec un vrai service LiveKit ne sont pas encore validés. Aucun compte LiveKit n'a été créé et aucun service payant n'a été souscrit.

## Suite de livraison
Après accord explicite : vérifier l'absence de nouvelles migrations concurrentes, appliquer la migration avec son entrée de journal et sa somme de contrôle, fusionner la pull request, suivre le déploiement Vercel et vérifier les routes en production. Garder la branche de test Neon tant que la livraison n'est pas validée. Ne pas fusionner avant l'application de la migration.
