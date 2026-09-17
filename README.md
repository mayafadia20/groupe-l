# Groupe L — Site web

Site vitrine de **Groupe L**, firme de consultation spécialisée en
**création de valeur opérationnelle** (*Operation Value Creation*).

## Structure

```
index.html     Page unique (héros, feuille de route, expertise, résultats, contact)
styles.css     Feuille de style — tokens de couleur, verre dépoli, texte chrome
script.js      Interactions légères (menu mobile, apparitions, jauge, compteurs)
assets/        Logo (blanc et bronze) et favicon
```

Aucune dépendance ni étape de build : ouvrir `index.html` dans un navigateur
ou servir le dossier avec n'importe quel serveur statique.

```bash
npx serve .
```

## Direction visuelle

- Bleu nuit profond avec halo bleu électrique en bas de chaque panneau
- Cartes et pilules en verre dépoli (`backdrop-filter`)
- Titres en dégradé chrome (blanc → gris acier)
- Cercles pointillés et points blancs comme signatures graphiques
- Typographie : Inter (300 / 400 / 500)

Les couleurs vivent dans les variables `:root` de `styles.css`.

## Déploiement

Le site est publié avec GitHub Pages depuis la branche `main` (racine).
