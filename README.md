# Groupe L — Site web

Site vitrine de **Groupe L**, cabinet de résolution de problèmes et
d'amélioration continue : fusions et acquisitions, définition de la
stratégie, implantation de systèmes, changement de structure. Des
résultats dans les 30 premiers jours.

## Structure

```
index.html     Page unique (héros, pour qui, le cabinet, 30 jours, services, résultats, contact)
styles.css     Feuille de style — tokens de couleur, panneaux clairs et sombres
script.js      Interactions légères (menu mobile, apparitions, compteurs)
assets/        Logo (blanc et bronze) et favicon
```

Aucune dépendance ni étape de build : ouvrir `index.html` dans un navigateur
ou servir le dossier avec n'importe quel serveur statique.

```bash
npx serve .
```

## Direction visuelle

- Monochrome éditorial : panneaux blanc cassé et noir en alternance ;
  le héros seul porte un vert-noir profond coupé en deux
- Typographie Inter (300 / 400 / 500), titres serrés, grandes tailles ;
  libellés et boutons en monospace majuscule espacé
- Icônes géométriques au trait fin, cercles pointillés, points blancs
- Navigation en `mix-blend-mode: difference` : blanche sur fond sombre,
  noire sur fond clair, sans changement de classe
- Le logo blanc sert partout ; sur fond clair, il passe en noir par
  `filter: invert(1)`

Les couleurs vivent dans les variables `:root` de `styles.css`.

## Déploiement

Le site est publié avec GitHub Pages depuis la branche `main` (racine).
