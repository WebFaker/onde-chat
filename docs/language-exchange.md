# Onde — échanges linguistiques

Cette livraison ajoute une découverte volontaire et des profils de langues, tout en conservant le consentement ami avant les messages privés. Le mode Duo écrit alterne deux langues avec un minuteur commun et une acceptation par l’autre personne.

La migration 011 est additive ; aucun compte existant n’est rendu découvrable et aucun serveur de démonstration n’est créé. La découverte masque les profils suspendus et les blocages dans les deux sens. Les profils sont modifiables dans Mon compte, puis Mon profil linguistique. Le backoffice peut retirer un profil de la découverte via l’action de nettoyage de profil existante.

Les sessions Duo sont réservées aux deux amis de la conversation. Une proposition expire après un jour. La durée est de 5, 10, 15 ou 20 minutes par langue. L’heure du serveur sert de référence ; le rafraîchissement de la page reprend la session en cours. Chacun peut terminer la session. Le blocage ou la fin de la relation interdit les accès suivants au Duo.

Cette étape concerne les échanges privés écrits. Les communautés publiques, appels réintroduits dans l’interface et le contrôle d’écran à distance ne font pas partie de cette livraison.

## Découverte par cartes et recherche

La migration 012 ajoute objectifs, niveaux par langue apprise, formats souhaités, disponibilités et fuseau horaire. Le classement explique les langues complémentaires, les objectifs communs, les passions et les créneaux compatibles. Les créneaux sont indicatifs : matin 9–12 h, après-midi 14–17 h, soirée 19–22 h, semaine ou week-end ; les fuseaux sont pris en compte selon le décalage courant. Ils ne constituent pas une réservation et un changement d’heure peut modifier leur correspondance.

Les cartes proposent Passer, Garder pour plus tard et Proposer un échange. Favoris et profils passés sont privés et persistés par compte. Le dernier passage est annulable. La recherche permet de retrouver un profil passé. Tous les affichages respectent les blocages, suspensions et retraits de la découverte.

Les invitations comprennent une introduction de 3 à 240 caractères et un créneau facultatif. Le créneau est saisi dans le fuseau de l’appareil puis stocké en UTC et affiché dans le fuseau du destinataire. Seul le destinataire peut accepter ; cela établit la relation d’amitié puis permet d’ouvrir le chat privé. Un refus ou une annulation n’ouvre pas la discussion. Les propositions en attente expirent après 30 jours et les envois répétés sur la même paire sont dédupliqués. Limite persistante partagée avec les demandes d’amis : 30 mutations par compte et minute.

## Ville et fuseau par GPS

La recherche de ville utilise la Geolocation API du navigateur, sur l’action explicite « Localiser ma ville avec GPS », avec autorisation du navigateur, une position fraîche et un délai maximum. Aucune sélection manuelle de ville et aucun suivi en arrière-plan. En cas de refus, le mode mondial reste utilisable ; il n’y a pas de repli silencieux sur l’adresse IP.

Le navigateur appelle directement le service client gratuit BigDataCloud avec la position courante pour retrouver la ville. Le texte dans l’interface explique la transmission des coordonnées et l’utilisation des signaux par le prestataire. Aucune requête serveur, aucun lot ni coordonnées archivées ne sont envoyés à cet endpoint. Les tests utilisent des réponses simulées et ne soumettent pas de fausses positions au service réel. Références : https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api et https://www.bigdatacloud.com/privacy-policy .

Le fuseau IANA est calculé localement depuis les coordonnées par tz-lookup puis peut être confirmé dans le profil. Ses frontières géographiques approximatives peuvent nécessiter une correction près d’une frontière. La position exacte n’est ni envoyée au backend Onde ni enregistrée : le client arrondit au dixième de degré et le backend impose aussi cet arrondi. Les autres membres reçoivent seulement la ville, le pays, le fuseau et une distance arrondie à 25 km. Le bouton Retirer ma localisation efface immédiatement la position approximative et la ville du profil. Le fuseau reste un réglage indépendant pour les disponibilités.

La localisation reste déclarative : aucune garantie d’authenticité contre un appareil modifié. Les formats vocaux et appels sont des préférences de rencontre ; cette livraison n’ajoute pas de bouton d’appel ou de prise de contrôle à distance.

Un blocage ou un retrait de la relation annule les invitations en attente et termine les Duos ouverts. Un déblocage ne réactive pas les anciennes propositions.
