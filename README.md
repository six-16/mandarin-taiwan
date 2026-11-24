# Mandarin de Taïwan · 50 mots

Petite application web (PWA) pour apprendre les 50 mots essentiels du mandarin de Taïwan.
Elle s'installe sur l'écran d'accueil du téléphone et fonctionne **sans connexion** une fois ouverte.

- **Apprendre** : 50 mots par thème, en caractères traditionnels, avec pinyin et zhuyin (ㄅㄆㄇ), voix, explication écrite et audio.
- **Voiture** : lecture mains libres (découverte ou quiz audio), pour apprendre à l'oreille.
- **Dessiner** : ordre des traits animé, puis tracé au doigt avec correction.
- **Checklist** : préparer son départ pour Taïwan (cases à cocher, lignes personnalisables).

---

## 1. Ouvrir l'application

Le fichier à ouvrir est **`index.html`** (à la racine du dossier).

**Pour un simple coup d'œil sur l'ordinateur**
1. Ouvre le dossier du projet.
2. Double-clique sur `index.html` : il s'ouvre dans ton navigateur (Chrome, Edge, Safari ou Firefox).
3. Dans ce mode, l'installation sur l'écran d'accueil et le mode hors-ligne ne sont pas disponibles. Tout le reste fonctionne.

**Pour tester comme sur un vrai site (recommandé)**
- Dans VS Code, installe l'extension **Live Server**, fais un clic droit sur `index.html` puis **Open with Live Server**.
- Ou, dans un terminal ouvert dans le dossier : `python3 -m http.server 8000`, puis va sur http://localhost:8000

---

## 2. Utiliser l'application

**Onglet Apprendre**
1. Choisis un thème avec les boutons du haut, ou garde « Tous ».
2. Touche un mot pour ouvrir sa fiche.
3. **Écouter** lit le mot, **Lentement** le lit au ralenti, **Explication vocale** lit le sens, la prononciation et un exemple (le texte est aussi affiché).
4. **Le dessiner** ouvre l'onglet Dessiner sur ce mot. **Marquer appris** fait avancer la barre de progression.
5. **Précédent / Suivant** permet d'enchaîner les mots.
6. Le bouton ⚙ en haut à droite permet de choisir pinyin, zhuyin ou les deux, et de régler les voix.

**Onglet Voiture** (à utiliser à l'arrêt pour lancer, puis à l'oreille)
1. Choisis le **mode** : *Découverte* (le mot, le sens, puis un temps pour répéter) ou *Quiz audio* (le sens en français, un temps pour chercher, puis la réponse).
2. Règle le thème, l'ordre, le temps pour répéter et la vitesse de la voix.
3. Appuie sur ▶ **avant de démarrer**, pose le téléphone, branche-le en Bluetooth ou par câble sur l'autoradio.
4. ◀ et ▶▶ passent au mot précédent ou suivant ; le bouton central met en pause.
5. Garde les yeux sur la route : tout se fait à l'oreille.

**Onglet Dessiner**
1. Choisis un mot dans la bande du haut (et un caractère si le mot en contient plusieurs).
2. **Voir les traits** montre l'ordre et le sens de chaque trait.
3. **À moi de tracer** : trace chaque trait avec le doigt, l'appli valide ou te fait recommencer, avec un indice après deux erreurs.
4. **Sans modèle** retire le guide, pour s'entraîner en difficile. **Effacer** recommence.

**Onglet Checklist**
Coche les étapes au fur et à mesure, ajoute tes propres lignes avec « Ajouter ». Tout est enregistré sur le téléphone. Les règles d'entrée et de séjour changent : vérifie toujours sur les sites officiels.

---

## 3. Personnaliser (prénom et petit mot)

1. Ouvre **`config.js`** dans VS Code.
2. Modifie les deux lignes :
   ```js
   window.CONFIG = {
     prenom:  "Camille",
     message: "Pour que tu te débrouilles dès le premier jour à Taïwan !"
   };
   ```
3. **Enregistre** (`Ctrl+S` / `Cmd+S`), puis commit et push.
4. Laisse `""` pour un accueil neutre.

Organisation conseillée : la branche `main` reste **générique**, une branche (par exemple `enio`) contient la version personnalisée qui est publiée.

---

## 4. Mettre en ligne

L'application est un site statique : aucun serveur à installer, tous les fichiers se publient tels quels.

**Netlify (le plus simple)**
1. Va sur app.netlify.com, crée un compte gratuit.
2. **Add new site › Import an existing project › GitHub**, choisis ce dépôt.
3. Choisis la branche à publier (`main` ou `enio`). Laisse les champs de build vides, dossier de publication : racine.
4. Dans *Site settings › Change site name*, choisis une adresse difficile à deviner.

**Cloudflare Pages** ou **GitHub Pages** conviennent aussi (même principe : branche à publier, dossier racine).

Après chaque push, le site se met à jour tout seul. Pour que les téléphones rechargent la nouvelle version, change la valeur de `VERSION` dans `sw.js` (par exemple `mandarin50-v2`).

---

## 5. Installer sur le téléphone

Ouvre l'adresse du site (ou scanne le QR code), puis :

- **iPhone (Safari obligatoire)** : bouton Partager › **Sur l'écran d'accueil** › Ajouter.
- **Android (Chrome)** : menu ⋮ › **Installer l'application** (ou « Ajouter à l'écran d'accueil »).

L'icône « 華 » apparaît avec les autres applications. Ouvre l'application une fois avec du réseau : ensuite elle marche hors-ligne.

---

## 6. Voix et dépannage

- Les voix sont celles du téléphone (gratuites, hors-ligne). Si aucune voix chinoise n'est détectée :
  - **iPhone** : Réglages › Accessibilité › Contenu énoncé › Voix › Chinois › choisir *Chinois (Taïwan)*.
  - **Android** : Réglages › Synthèse vocale › installer les données vocales chinoises (Taïwan).
- Si l'écran se verrouille, la voix peut s'arrêter (surtout sur iPhone) : garde l'option « Garder l'écran allumé ».
- Pour repartir de zéro : ⚙ › **Remettre la progression à zéro** (sur ce téléphone seulement).
- Si une mise à jour n'apparaît pas : ferme complètement l'application et rouvre-la, ou vérifie que `VERSION` a changé dans `sw.js`.

---

## 7. Contenu du dossier

| Fichier | Rôle |
|---|---|
| `index.html` | Page de l'application (à ouvrir) |
| `style.css` | Apparence |
| `app.js` | Fonctionnement (onglets, voix, mode voiture, tracé, checklist) |
| `config.js` | Prénom et petit mot d'accueil |
| `words.js` | Les 50 mots (généré par `tools/gen_words.py`) |
| `chars.js` | Données de tracé des caractères (généré par `tools/build_chars.py`) |
| `hanzi-writer.min.js` | Bibliothèque de tracé |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installation et mode hors-ligne |
| `tools/` | Scripts pour régénérer les données |

### Régénérer les données (facultatif)
- `pip install pypinyin` puis `python3 tools/gen_words.py` → `words.js`
- `npm install hanzi-writer-data` puis `python3 tools/build_chars.py` → `chars.js`

## Crédits
Tracé : [Hanzi Writer](https://hanziwriter.org) (MIT), données [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) (Arphic Public License).
