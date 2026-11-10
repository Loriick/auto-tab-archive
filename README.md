# Auto Tab Archive

Extension Chrome (Manifest V3) qui archive automatiquement les onglets inactifs, comme Arc. Un onglet que tu n'as pas consulté depuis **12 heures** (réglable) est fermé, puis rangé dans une archive. Pour le rouvrir, clique sur l'icône de l'extension.

**Onglets jamais archivés :**
- les onglets épinglés ;
- les onglets rangés dans un groupe ;
- l'onglet actif de chaque fenêtre. Une fenêtre n'est donc jamais vidée ni fermée.

Il faut Chrome 121 ou plus récent, qui fournit `tab.lastAccessed`.

## Permissions

| Permission | Pourquoi |
|---|---|
| `alarms` | Vérification toutes les 5 min. Le service worker est éphémère, donc pas de `setInterval`. |
| `tabs` | Lire l'URL et le titre des onglets fermés, pour pouvoir les archiver. |
| `storage` | Conserver l'archive (`local`), les réglages (`sync`) et l'heure de démarrage de Chrome (`session`). |

## Installation

1. Télécharger le code : bouton vert **Code** → **Download ZIP** sur GitHub, puis décompresser. Ou bien : `git clone https://github.com/Loriick/auto-tab-archive.git`.
2. Ouvrir `chrome://extensions`.
3. Activer le **Mode développeur** (en haut à droite).
4. Cliquer sur **Charger l'extension non empaquetée** et choisir le dossier qui contient `manifest.json`.
5. Optionnel : épingler l'icône dans la barre d'outils (pièce de puzzle → punaise).

## Réglages

Pour ouvrir la page d'options : clic sur ⚙ dans le popup, ou clic droit sur l'icône → **Options**. Les changements sont enregistrés tout de suite et s'appliquent à la vérification suivante (dans 5 minutes au plus).

| Réglage | Défaut | Choix |
|---|---|---|
| Délai d'inactivité | 12 heures | 12 h, 24 h, 7 jours, 30 jours |
| Épargner l'onglet actif de chaque fenêtre | oui | |
| Épargner les onglets dans un groupe | oui | |
| Épargner les onglets qui jouent du son | non | |

Les onglets épinglés ne sont jamais archivés. Ce n'est pas réglable.

Les réglages par défaut sont dans `settings.js`. Trois constantes avancées se trouvent en haut de `background.js` : `CHECK_EVERY_MINUTES` (5), `ARCHIVE_MAX_ITEMS` (500) et `ARCHIVE_RETENTION_DAYS` (30).

## Le popup

- Clic sur une ligne : rouvre l'onglet et le retire de l'archive.
- `×` : retire l'onglet de l'archive sans le rouvrir.
- Champ de recherche : filtre sur le titre et l'URL.
- **Tout effacer** : vide l'archive.

## Tester rapidement

1. Ouvrir la console du service worker (lien **service worker** dans `chrome://extensions`).
2. Régler le délai sur 1 minute :
   ```js
   chrome.storage.sync.set({ archiveAfterHours: 1 / 60 })
   ```
3. Ouvrir quelques onglets et rester plus d'une minute sur un autre onglet.
4. Taper `runArchive()` pour lancer l'archivage sans attendre l'alarme.
5. Remettre un délai normal depuis la page d'options. Pendant le test, la valeur de 1 minute y apparaît comme « valeur de test ».

## Comportements à connaître

- **Démarrage de Chrome.** À chaque démarrage, et à l'installation, le compteur d'inactivité de tous les onglets repart de zéro. Sans ça, tous les onglets restaurés de la veille seraient archivés d'un coup à l'ouverture.
- **Veille.** Le temps passé en veille compte comme de l'inactivité. Après une nuit en veille, les onglets non consultés sont archivés au réveil, comme dans Arc.
- **Onglets non archivés.** Les onglets vides (nouvel onglet, `about:blank`) sont fermés mais pas archivés.
- **Navigation privée.** Les onglets privés ne sont jamais touchés ni enregistrés.
- **Formulaires.** Un onglet contenant un formulaire non enregistré est fermé sans confirmation. Son contenu est perdu, même si l'URL est archivée.
- **Fenêtres concernées.** Seules les fenêtres « normales » sont concernées (pas les popups ni les fenêtres d'application).
- **Autres moyens de récupération.** `Ctrl+Shift+T` et l'historique Chrome fonctionnent toujours.

## Licence

MIT, voir [LICENSE](LICENSE).
