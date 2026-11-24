# Mandarin de Taïwan · 50 mots

Petite web-app (PWA) pour apprendre les 50 mots essentiels du mandarin de Taïwan : prononciation (pinyin + zhuyin) avec voix, mode « voiture » mains libres, tracé des caractères traditionnels et checklist de départ. Fonctionne hors-ligne, s'installe sur l'écran d'accueil.

## Personnaliser
Édite `config.js` : `prenom` et `message` (écran d'accueil).

## Mettre en ligne (site statique)
Tout le dossier se publie tel quel : GitHub Pages, Netlify, Cloudflare Pages. Les fichiers sont à la racine.
Après une modification, change `VERSION` dans `sw.js` pour que les téléphones rechargent la nouvelle version.

## Tester en local
`python3 -m http.server 8000` puis ouvrir http://localhost:8000

## Régénérer les données
- `python3 tools/gen_words.py` → `words.js` (liste des 50 mots, pinyin/zhuyin via `pypinyin`)
- `npm install hanzi-writer-data` puis `python3 tools/build_chars.py` → `chars.js`

## Crédits
Tracé : [Hanzi Writer](https://hanziwriter.org) (MIT), données [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) (Arphic Public License).
