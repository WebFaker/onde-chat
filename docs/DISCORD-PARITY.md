# Onde : fonctions communautaires et limites

Onde est une application indépendante. Un abonnement Discord Nitro ne peut pas être transféré ou activé dans Onde. Aucun paiement ni abonnement Onde n'est actuellement proposé.

## Disponible

- Comptes, sessions, serveurs privés et invitations expirantes.
- Salons texte, messages privés à deux, réponses, réactions, modification, suppression, épinglage et recherche des 150 messages chargés.
- Fichiers autorisés et téléchargements contrôlés par les droits du salon : 1 Mo par fichier, 20 Mo par utilisateur.
- Rôles prédéfinis, exclusion, journal de modération et messages non lus.
- Présentation de profil et présence récemment active.
- Texte enrichi : gras, italique, souligné, barré, code, liens HTTP(S), spoilers révélables au clavier.
- Personnalisation gratuite sur cet appareil : thèmes classique/minuit/clair, densité, taille du texte, réduction des animations. Pas encore synchronisée entre appareils.

## Intégré mais dépend d'un service externe

Les salons vocaux disposent du client LiveKit avec micro, caméra et partage d'écran. Le serveur doit recevoir LIVEKIT_URL, LIVEKIT_API_KEY et LIVEKIT_API_SECRET. Sans ces valeurs, aucun appel ne fonctionne. Les tests de jetons ne prouvent pas le fonctionnement d'un appel entre deux appareils. Tester les permissions, la reconnexion et le réseau avant de déclarer cette fonction disponible.

## À construire

- Avatars et bannières, y compris animés ; décoration de profil et surnoms par serveur.
- Emojis et stickers personnalisés, utilisation entre serveurs.
- Stockage objet et téléversement direct pour les gros fichiers ; quotas contrôlés côté serveur. Ne pas augmenter la limite base64 sur Vercel pour simuler cette fonction.
- Permissions par salon, rôles personnalisables, bannissement, blocage, signalement et anti-spam.
- Threads, forums, événements, sondages, messages privés de groupe et statut personnalisé.
- Transport temps réel (les messages utilisent actuellement une actualisation toutes les cinq secondes), saisie en cours et notifications push.
- Appels privés/de groupe, paramètres audio, qualité vidéo vérifiée et infrastructure média dimensionnée.
- Vérification d'e-mail et récupération du compte avec un fournisseur d'envoi configuré.
- Si demandé : abonnement propre à Onde avec prestataire de paiement, webhooks vérifiés, droits calculés côté serveur, annulation et gestion des échecs. Aucun faux badge ne remplace ces contrôles.

Les boosts et promesses de qualité nécessitent des règles produit et des ressources réelles. Cette liste décrit les fonctions manquantes ; elle ne constitue pas une annonce de disponibilité.
