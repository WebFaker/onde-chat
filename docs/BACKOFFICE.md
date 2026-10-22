# Administration du site

Adresse : `/admin.html`. Se connecter d'abord dans le chat, avec le même navigateur.

## Autorisation

L'accès est accordé à une paire explicite d'identifiants internes (profil et utilisateur d'authentification) dans `site_admins`. Une adresse e-mail, un pseudo, un rôle de serveur ou un champ envoyé par le navigateur ne confère aucun droit d'administration du site. Aucun administrateur n'est créé automatiquement à l'inscription. Le compte initial doit être créé par son propriétaire, puis identifié et explicitement habilité par l'opérateur. Aucun mot de passe n'est partagé ou défini par le backoffice.

La migration 006 est additive. Elle crée les habilitations et le journal, ainsi que les champs de suspension et d'archivage. Appliquer la migration avant de publier le code. Une base sans administrateur reste inaccessible au backoffice jusqu'à l'habilitation explicite du compte.

## Outils

- Vue d'ensemble des comptes, suspensions, serveurs, salons, messages et volume des fichiers.
- Utilisateurs : recherche par pseudo ou e-mail, suspension/réactivation, révocation des sessions et retrait de la personnalisation du profil.
- Serveurs : modification du nom et de la description, archivage et restauration, liste des membres et changement de leurs rôles prédéfinis.
- Salons : modification du nom et du sujet, archivage et restauration.
- Messages des serveurs : recherche et masquage pour modération. Les messages privés et leur contenu ne sont pas listés.
- Journal protégé : acteur, cible, action, motif et date. Chaque modification et sa trace sont validées dans la même transaction.
- Listes paginées par 50 éléments et recherche bornée. Aucun mot de passe ni jeton de session n'est exposé.

Le compte administrateur est protégé contre sa suspension et la révocation de ses sessions par ces outils. L’ancien serveur d’accueil est désormais archivé par la migration 007 ; son inscription automatique est désactivée. Le rôle propriétaire d'un serveur ne peut pas être modifié ici. Aucune suppression définitive de comptes, bases ou serveurs n'est proposée.

La suspension est vérifiée à chaque appel de l'API métier, même après une nouvelle connexion. Les sessions existantes sont révoquées. Better Auth peut encore accepter un mot de passe valide pour ce compte, mais l'application lui refuse l'accès tant que la suspension reste active.

L'archivage retire les serveurs/salons des listes et bloque leurs accès métier ainsi que l'utilisation des invitations d'un serveur archivé. Il ne supprime pas les données. Aucun mécanisme de coupure d'un appel LiveKit déjà connecté n'est encore implémenté.

## Limites

Ce backoffice ne gère pas les clés d'hébergement, les factures du fournisseur, les sauvegardes ou la configuration d'un service e-mail/LiveKit. Le masquage de messages conserve les données en base pour l'opérateur. Les suppressions de personnalisation retirent définitivement les médias concernés. Il n'existe pas d'interface d'attribution de nouveaux droits d'administration du site : cette opération reste explicitement réservée à l'opérateur.

Les fixtures de compte administrateur et leur mot de passe connu figurent exclusivement dans le serveur de test isolé ; elles ne sont ni exécutées ni importées par le serveur de production.
