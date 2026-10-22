# Onde : discussions entre amis

La page principale charge uniquement friends.js, friends.css et l'adaptateur HTTP commun. Elle ne charge pas les serveurs, salons, rôles, appels, sonneries ou options de personnalisation avancée. Ces données et modules sont conservés pour éviter toute perte et permettre une réintroduction ultérieure. Le backoffice reste accessible au compte administrateur depuis « Mon compte ».

## Parcours principal

1. Créer un compte ou se connecter.
2. Rechercher le pseudo complet d'un ami, sans exposer d'adresse e-mail dans les résultats.
3. Envoyer une demande ; seul le destinataire peut l'accepter.
4. Ouvrir une conversation privée, envoyer du texte, une image ou une réaction.
5. Retrouver les messages en rechargeant la page ou en se reconnectant.

Les conversations existantes sont préservées : la migration 009 reprend leurs participants comme contacts acceptés. Aucun serveur commun n'est nécessaire pour les nouveaux contacts.

## Fiabilité et accès

- Actualisation automatique toutes les deux secondes lorsque l'onglet est visible, sans rechargement manuel.
- Vérifications d'appartenance à chaque accès aux messages et aux fichiers. L'identité provient exclusivement de la session côté serveur.
- Brouillons conservés en mémoire par conversation pendant la session ; ils ne survivent pas à une fermeture ou un rechargement.
- Envoi désactivé pendant la requête. Les tentatives portant la même clé d'envoi ne créent qu'un message, même si la première réponse réseau a été perdue.
- Marquage lu jusqu'au dernier message effectivement chargé, pour ne pas absorber un message arrivé entre lecture et acquittement.
- Historique paginé par 150 messages, modification et suppression de ses messages, trois réactions simples.
- Images PNG/JPEG/WebP/GIF jusqu'à 1 Mo ; aperçu décodé, redimensionné et converti en WebP sur le serveur. Les pièces jointes historiques restent téléchargeables.
- Le blocage coupe les demandes et l'accès à la conversation. Le déblocage conserve l'historique mais nécessite une nouvelle amitié acceptée pour reprendre les envois.
- Retirer un ami conserve également les messages et empêche les nouveaux envois jusqu'à une nouvelle acceptation.

Il ne s'agit pas d'une connexion WebSocket et il n'y a pas de notifications push lorsque la page est fermée. Les comptes, sessions, suspensions et habilitations administrateur existants restent inchangés.

## Vérification

Les tests navigateur principaux couvrent la nouvelle interface, le backoffice, deux comptes, les demandes, les échanges, images autorisées, réactions, rechargement, mobile, blocage, panne réseau et réponse perdue après enregistrement. Les anciennes suites navigateur communautaires sont conservées mais ne font plus partie du parcours publié. Les tests backend historiques continuent de couvrir les modules conservés.
