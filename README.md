# LIFE CONTROL PRO — première version fonctionnelle

Application Android en React Native + Expo. Cette version comprend cinq modules : Accueil, Planning, Tâches, Habitudes et Objectifs.

## Fonctionnalités présentes
- Navigation mobile en cinq onglets.
- Création, modification et suppression de tâches, activités, habitudes et objectifs.
- Priorité, catégorie et échéance pour les tâches.
- Dates et heures pour les activités.
- Cases à cocher et progression des objectifs.
- Données sauvegardées localement avec AsyncStorage, utilisables hors connexion.
- Demande d’autorisation avant d’activer un rappel de notification.
- Export JSON préparé dans le stockage local de l’application et confirmation avant suppression des données.

## Limites connues de cette première version
- Le planning est une liste chronologique, pas encore un calendrier graphique jour/semaine/mois.
- Les rappels sont un rappel quotidien général. Les notifications individuelles par activité sont à développer.
- Les habitudes ne se réinitialisent pas automatiquement chaque jour; la remise à zéro par date est à ajouter.
- « Export JSON » prépare une copie dans le stockage de l’application mais ne crée pas encore un fichier partageable. Une prochaine version peut intégrer `expo-file-system` et `expo-sharing`.
- Il n’y a pas encore de compte, de synchronisation cloud ni d’assistant IA. L’IA nécessite un backend sécurisé et une clé API conservée côté serveur, jamais dans l’application.
- AsyncStorage est un stockage local pratique mais non chiffré. Ne pas y enregistrer de mots de passe ou de données extrêmement sensibles.

## Tester sur Android depuis un téléphone
1. Installe **Expo Go** depuis le Play Store.
2. Place ce dossier dans un dépôt GitHub (ou un environnement de développement cloud compatible).
3. Depuis un environnement qui peut exécuter Node.js, lance :
   ```bash
   npm install
   npx expo start
   ```
4. Scanne le QR code avec Expo Go.
5. Pour les notifications, teste sur un appareil réel et accepte l’autorisation lorsqu’elle est demandée. Les notifications peuvent se comporter différemment dans Expo Go selon la version d’Expo; un build Android de développement est recommandé pour les tests avancés.

## Développer depuis un téléphone uniquement
- Utilise un éditeur mobile pour modifier les fichiers et GitHub pour conserver les versions.
- Pour exécuter le projet sans ordinateur, utilise un environnement cloud de développement compatible Node.js/Expo; tous les services cloud n’offrent pas les mêmes possibilités.
- Expo Snack peut servir à tester rapidement des prototypes, mais les dépendances natives et les notifications peuvent nécessiter une configuration particulière.
- Pour produire un APK installable, utilise EAS Build depuis Expo. Il faut un compte Expo et une connexion internet; vérifie les limites et conditions actuelles du service.

## Sauvegarder et restaurer
- Les données sont sauvegardées automatiquement dans le stockage privé de l’application sur le téléphone.
- Si tu désinstalles l’application ou effaces ses données Android, la sauvegarde locale peut disparaître.
- Pour une vraie sauvegarde externe, la prochaine étape recommandée est d’ajouter l’export JSON vers un fichier partageable, puis une restauration contrôlée.
- Ne considère pas la sauvegarde locale comme une synchronisation cloud.

## Architecture recommandée pour la suite
1. Ajouter tests unitaires et tests d’interface.
2. Séparer les écrans et composants dans `src/screens`, `src/components` et `src/storage`.
3. Ajouter un calendrier et les notifications individuelles.
4. Ajouter les modules Études, Sport, Budget, Musique, Jeux vidéo et Statistiques.
5. Ajouter une authentification et une base cloud seulement si la synchronisation multi-appareils est nécessaire.
6. Ajouter l’assistant IA via un backend (par exemple une fonction serveur). La clé API doit rester dans les variables d’environnement du serveur.
7. Ajouter une politique de confidentialité, export de fichier, restauration et suppression vérifiée.

## Dépendances principales
- Expo / React Native
- `@react-native-async-storage/async-storage`
- `expo-notifications`

## Générer un APK Android installable avec EAS Build
1. Crée un compte sur le site Expo si tu n’en as pas.
2. Depuis un terminal Node.js (ordinateur ou terminal cloud), place-toi dans ce dossier.
3. Installe les dépendances et EAS CLI :
   ```bash
   npm install
   npm install -g eas-cli
   eas login
   eas build:configure
   ```
4. Lance le profil APK de test :
   ```bash
   eas build --platform android --profile preview
   ```
5. Quand la compilation cloud est terminée, ouvre le lien de téléchargement fourni par EAS sur ton téléphone Android et installe l’APK. Android peut demander l’autorisation d’installer des applications provenant de cette source.

La compilation EAS nécessite Internet et un compte Expo. L’APK n’est pas inclus dans cette archive : il doit être compilé par EAS. Vérifie les conditions et limites actuelles du service Expo.
