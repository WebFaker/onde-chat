# Onde pour iOS

Application SwiftUI / WKWebView, iOS 16+, iPhone et iPad. Elle charge exclusivement
https://onde-chat.vercel.app dans son navigateur intégré : même backend, mêmes
comptes et fonctionnalités que le site. Connexion internet requise. Les mises à
jour du site sont disponibles immédiatement ; les changements natifs nécessitent
une nouvelle compilation.

Cookies persistants WebKit, navigation retour par geste, chargement et reprise
après erreur réseau. Les liens externes HTTPS s’ouvrent dans le navigateur système.
Le GPS utilise l’autorisation iOS « lors de l’utilisation » ; l’explication de la
permission est fournie. Les règles de confidentialité et le consentement du site
s’appliquent également. Aucune permission caméra/micro n’est demandée : les appels
ne sont pas activés dans cette version du site. Pas de notifications push natives,
de mode hors ligne ni de paiement intégré.

## Compiler et essayer

Sur Mac, installer Xcode et XcodeGen (`brew install xcodegen`), puis :

```
xcodegen generate --spec ios/project.yml
open ios/Onde.xcodeproj
```

Sélectionner le schéma Onde et un simulateur, puis Run. Pour un iPhone physique,
sélectionner votre équipe Apple dans Signing & Capabilities et choisir un bundle
identifier disponible (la valeur com.webfaker.onde est provisoire).

Le workflow GitHub Actions **iOS build** compile et lance la version simulateur,
produit une capture d’écran, puis compile une archive iPhone **non signée**.
L’artefact Onde-iOS est conservé 14 jours. Le ZIP simulateur s’installe dans un
simulateur démarré avec `xcrun simctl install booted /chemin/Onde.app`.
L’archive non signée ne s’installe pas sur un iPhone : il faut la signer avec une
équipe Apple et un profil de provisioning, ou recompiler dans Xcode.

## Distribution

TestFlight / App Store nécessitent un compte Apple Developer, les certificats et
les profils de signature. Aucun secret Apple n’est inclus. Avant distribution :
icône finale, tests sur iPhone réel (connexion, clavier, photos, GPS, traductions),
déclarations de confidentialité Apple, politique de confidentialité publique et
vérification des règles App Review. Une enveloppe WebView ne garantit pas
l’acceptation sur l’App Store. Le lancement en simulateur ne valide pas le GPS
physique ni l’ensemble des parcours du site sur iPhone.
